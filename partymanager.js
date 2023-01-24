const TelegramBot = require("node-telegram-bot-api");
const token = "YOUR-TOKEN";
const bot = new TelegramBot(token, { polling: true });
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://<USER>:<PASSWORD>@mongobbdd.sqlpw.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

/*
 *
 *   *   *   FUNCTIONS    *   *   *
 *
 */

// DATABASE FUNCTIONS

// Function to check if the user exists
const checkUser = (chatId, user, characterName) => {
  if (!user.includes("@")) user = `@${user}`;
  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .findOne({ chatId: chatId, user: user })
      .then((res) => {
        if (res === null) insertCharacter(chatId, user, characterName);
        else bot.sendMessage(chatId, "The user already has a character!");
      })
      .catch((error) =>
        bot.sendMessage(chatId, `There was an error: ${error}`)
      );
  });
  // client.close();
};

// Function to insert a new character on the DB
const insertCharacter = (chatId, user, characterName) => {
  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .insertOne({
        chatId: chatId,
        user: user,
        characterName: characterName,
        lifePoints: 0,
        maxLifePoints: 0,
      })
      .then((res) =>
        bot.sendMessage(chatId, "The character was added to the party!🎉")
      )
      .catch((error) =>
        bot.sendMessage(chatId, `There was an error: ${error}`)
      );
    // client.close();
  });
};

// Function to heal or damage character
const changeLife = (chatId, typeOfTarget, target, difference) => {
  if (typeOfTarget === "user" && !target.includes("@")) target = `@${target}`;
  let life;

  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .findOne({
        chatId: chatId,
        [typeOfTarget]: target,
      })
      .then((res) => {
        if (res === null) return;
        life = res.lifePoints + difference;
        if (life < 0) life = 0;
      });
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .findOneAndUpdate(
        {
          chatId: chatId,
          [typeOfTarget]: target,
        },
        { $set: { lifePoints: life } }
      )
      .then((res) => {
        if (res.value === null) return;
        const finalMessage =
          `The life points of ${res.value.characterName} was updated!\n\n` +
          `Now you have ${life} life points ${res.value.user}`;

        life !== 0
          ? bot.sendMessage(chatId, finalMessage)
          : bot.sendMessage(chatId, finalMessage + " 😵");
      })
      .catch((error) =>
        bot.sendMessage(chatId, `There was an error: ${error}`)
      );
  });
  // client.close();
};

// Function to rest (set the current life points to the maximum)
const rest = (chatId) => {
  let partyMembers = [];

  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .find({
        chatId: chatId,
      })
      .forEach((character) => {
        partyMembers.push(character);
      })
      .then(() => {
        partyMembers.forEach((character) => {
          client
            .db("TelegramBots")
            .collection("PartyManager")
            .findOneAndUpdate(
              {
                chatId: chatId,
                user: character.user,
                characterName: character.characterName,
              },
              { $set: { lifePoints: character.maxLifePoints } }
            )
            .catch((error) =>
              bot.sendMessage(chatId, `There was an error: ${error}`)
            );
        });
      })
      .then(() =>
        bot.sendMessage(
          chatId,
          "The party take a long break and recovers its life points 😴🌙"
        )
      )
      .catch((error) =>
        bot.sendMessage(chatId, `There was an error: ${error}`)
      );
    // client.close();
  });
};

// Function to get all the data of the DB
const getData = (chatId) => {
  let data = "⚔️PARTY⚔️\n";
  const space = "\t\t\t\t\t";

  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .find({
        chatId: chatId,
      })
      .forEach((element) => {
        element.lifePoints !== 0
          ? (data += `-${element.characterName} (${element.user}):\n${space}${element.lifePoints}/${element.maxLifePoints}✔️\n`)
          : (data += `-${element.characterName} (${element.user}):\n${space}${element.lifePoints}/${element.maxLifePoints}❌\n`);
      })
      .then(() => {
        data.length > 10
          ? bot.sendMessage(chatId, data)
          : bot.sendMessage(chatId, "There is no party here🎈");
      });
    // client.close();
  });
};

// Function to delete a character
const deleteCharacter = (chatId, typeOfTarget, target) => {
  if (typeOfTarget === "user" && !target.includes("@")) target = `@${target}`;
  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .deleteOne({ chatId: chatId, [typeOfTarget]: target })
      .then((res) => {
        if (res !== null && res.deletedCount > 0)
          bot.sendMessage(chatId, `The character was deleted🔪`);
      })
      .catch((error) =>
        bot.sendMessage(chatId, `There was an error: ${error}`)
      );
  });
};

// Function to delete all the data
const reset = (chatId) => {
  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .deleteMany({
        chatId: chatId,
      })
      .then(() => bot.sendMessage(chatId, "☠️The party was eradicated!☠️"))
      .catch((error) =>
        bot.sendMessage(chatId, `There was an error: ${error}`)
      );
    // client.close();
  });
};

// Function to change attributes of a stored character
const changeAttribute = async (
  chatId,
  typeOfTarget,
  target,
  attribute,
  newParameter
) => {
  if (newParameter === null) return;
  client.connect(async (err) => {
    await client
      .db("TelegramBots")
      .collection("PartyManager")
      .findOneAndUpdate(
        {
          chatId: chatId,
          [typeOfTarget]: target,
        },
        { $set: { [attribute]: newParameter } }
      )
      .then((res) => {
        if (res.value !== null) {
          bot.sendMessage(
            chatId,
            `The attribute of ${res.value.characterName} was set to ${newParameter}.\n\n${res.value.user}`
          );
        }
      });
  });
  // client.close();
};

// Function to manage changes in a character
const manageChanges = (chatId, target, attribute, newParameter) => {
  if (!target.includes("@")) target = `@${target}`;
  changeAttribute(chatId, "user", target, attribute, newParameter);
  changeAttribute(
    chatId,
    "characterName",
    target.replace("@", ""),
    attribute,
    newParameter
  );
};

/*
 *
 *   *   *   COMMAND LIST    *   *   *
 *
 */

// Command for tests
bot.onText(/^\/add(.+)/, (msg, match) => {
  const data = match[1].trim().split(" ");
  if (data.length !== 2) return;
  const user = data[0];
  const character = data[1];

  checkUser(msg.chat.id, user, character);
});

// Command to get all the characters' data
bot.onText(/^\/party/, (msg) => getData(msg.chat.id));

// Command to delete a character
bot.onText(/^\/kill(.+)/, (msg, match) => {
  const data = match[1].trim();

  deleteCharacter(msg.chat.id, "user", data);
  deleteCharacter(msg.chat.id, "characterName", data);
});

// Command to delete the current party
bot.onText(/^\/reset/, (msg) => reset(msg.chat.id));

// Command to set the current character's life points
bot.onText(/^\/setLifePoints(.+)/, (msg, match) => {
  const data = match[1].trim().split(" ");
  if (data.length !== 2) return;
  const target = data[0];
  const newLifePoints = parseInt(data[1]);

  !isNaN(newLifePoints)
    ? manageChanges(msg.chat.id, target, "lifePoints", newLifePoints)
    : bot.sendMessage(
        msg.chat.id,
        "Something was wrong! You should type _/setLifePoints + user/character name + amount of life_.",
        { parse_mode: "Markdown" }
      );
});

// Command to set the maximum character's life points
bot.onText(/^\/setMaxLifePoints(.+)/, (msg, match) => {
  const data = match[1].trim().split(" ");
  if (data.length !== 2) return;
  const target = data[0];
  const newMaxLifePoints = parseInt(data[1]);

  !isNaN(newMaxLifePoints)
    ? manageChanges(msg.chat.id, target, "maxLifePoints", newMaxLifePoints)
    : bot.sendMessage(
        msg.chat.id,
        "Something was wrong! You should type _/setMaxLifePoints + user/character name + amount of life_.",
        { parse_mode: "Markdown" }
      );
});

// Command to set the character's whole life
bot.onText(/^\/setLife(.+)/, (msg, match) => {
  const data = match[1].trim().split(" ");
  if (data.length !== 2) return;
  const target = data[0];
  const life = data[1].split("/");
  const currentLife = parseInt(life[0].trim());
  const maxLife = parseInt(life[1].trim());

  if (isNaN(currentLife) || isNaN(maxLife))
    bot.sendMessage(
      msg.chat.id,
      "Something was wrong! You should type _/setLife + user/character name + current life / maximum life_.",
      { parse_mode: "Markdown" }
    );
  else {
    manageChanges(msg.chat.id, target, "lifePoints", currentLife);
    manageChanges(msg.chat.id, target, "maxLifePoints", maxLife);
  }
});

// Command to heal a character
bot.onText(/^\/heal(.+)|\/damage(.+)/, (msg, match) => {
  const data = match[0].split(" ");
  if (data.length !== 3) return;
  const action = data[0];
  const target = data[1];
  let lifeDifference = parseInt(data[2]);

  if (isNaN(lifeDifference))
    bot.sendMessage(
      msg.chat.id,
      "Something was wrong! You should type the user or the character name + a valid number."
    );
  else {
    if (action === "/damage") lifeDifference *= -1;
    changeLife(msg.chat.id, "user", target, lifeDifference);
    changeLife(msg.chat.id, "characterName", target, lifeDifference);
  }
});

// Command to get a long rest (current life => maximum life points)
bot.onText(/^\/rest/, (msg) => rest(msg.chat.id));

// Command to start
bot.onText(/^\/start/, (msg) =>
  bot.sendMessage(
    msg.chat.id,
    "♥️Welcome to your *Party Manager* bot!!!♥️\n" +
      "It is created especially for the D&D system, but can be used to account for life and resources in other systems." +
      "It allows to have one party per chat, but only one character per user.\nFor assistance or more information about " +
      "the bot commands use the _/help_ command.",
    { parse_mode: "Markdown" }
  )
);

// Command for help
bot.onText(/^\/help/, (msg) =>
  bot.sendMessage(
    msg.chat.id,
    "*BOT COMMANDS*\n\n" +
      "1. Use _/add + user + character's name_ to add a new character to the party.\n" +
      "\tEx. /add @RubenPal Florecitas\n\n" +
      "2. Use _/setLifePoints + user/character's name_ to set the current life points.\n" +
      "\tEx. /setLifePoints Florecitas 24\n\n" +
      "3. Use _/setMaxLifePoints + user/character's name_ to set the maximum life points.\n\n" +
      "4. Use _setLife + user/character + current life / maximum life_ to set the whole life easier\n" +
      "\tEx. /setLife RubenPal 24/26\n\n" +
      "5. You can also use _/heal_ or _/damage + user/character + amount of life_ to heal/damage a character." +
      " You can heal above maximum health to emulate temporary life points, but you cannot damage below 0.\n" +
      "\tEx. /heal Florecitas 8\n\n" +
      "6. Use _/rest_ to take a long break (all life points become maximums).\n\n" +
      "7. Use _/party_ to see all the characters and their life points.\n\n" +
      "8. Use _/kill + user/character's name_ to kill and delete him from the party.\n" +
      "\tEx. /kill Florecitas (😢)\n\n" +
      "9. Use _/reset_ to delete all the party data.\n\n\n" +
      "If you have any issues or questions type to *@RubenPal*✏️",
    { parse_mode: "Markdown" }
  )
);

// Command for tests
bot.onText(/^\/test/, (msg) => {});

/*
    Bot available in telegram ( @DnD_PartyManager_bot )
    Created by: Rubén Palomo Fontán
    LinkedIn: https://www.linkedin.com/in/ruben-palomo-fontan/
    Contact: ruben.palomof@gmail.com
 */
