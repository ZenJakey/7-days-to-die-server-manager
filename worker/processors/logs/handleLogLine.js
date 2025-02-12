const _ = require('lodash');

const replaceQuotes = string => string.substring(1, string.length - 1);
const extractIntegers = string => string.match(/\d*/g).join('');

const steamIdRegex = /\d{17}/g;
const deathRegex = /(PlayerSpawnedInWorld \(reason: Died, position:)/g;
const deathValuesRegex = /([A-Za-z_]*)=(?:'([^']*)'|(\d*))/gm;

const connectedRegex = /(Player connected,)/g;

const joinedRegex = /(PlayerSpawnedInWorld \(reason: EnterMultiplayer, position:)/g;
const joinedValuesRegex = /([A-Za-z_]*)=(?:'([^']*)'|(\d*))/gm;

const newLevelRegex = /(made level \d*)/g;
const oldLevelRegex = /(was )\d*/g;

const entityKilledRegex = /(killed .*)/g;

const gmsgDeathRegex = /GMSG: Player '(\w+)' died/;
const gmsgPvPDeathRegex = /GMSG: Player (.+) killed by (.+)/;

module.exports = logLine => {


  let returnValue = {
    type: 'logLine',
    data: logLine
  };

  if (_.startsWith(logLine.msg, 'Time:')) {
    // {
    //     date: '2018-04-12',
    //     time: '22:01:21',
    //     uptime: '72067.431',
    //     msg: 'Time: 1200.60m FPS: 36.24 Heap: 769.5MB Max: 924.2MB Chunks: 361 CGO: 14 Ply: 1 Zom: 10 Ent: 11 (20) Items: 0 CO: 2 RSS: 1440.9MB',
    //     trace: '',
    //     type: 'Log'
    // }

    // Find the positions of the data points
    let splitLogLine = logLine.msg.split(' ');
    let fpsIdx = splitLogLine.indexOf('FPS:');
    let heapIdx = splitLogLine.indexOf('Heap:');
    let chunksIdx = splitLogLine.indexOf('Chunks:');
    let zombiesIdx = splitLogLine.indexOf('Zom:');
    let entitiesIdx = splitLogLine.indexOf('Ent:');
    let playersIdx = splitLogLine.indexOf('Ply:');
    let itemsIdx = splitLogLine.indexOf('Items:');
    let rssIdx = splitLogLine.indexOf('RSS:');

    let memUpdate = {
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg,
      fps: fpsIdx === -1 ? '' : splitLogLine[fpsIdx + 1],
      heap: heapIdx === -1 ? '' : splitLogLine[heapIdx + 1],
      chunks: chunksIdx === -1 ? '' : splitLogLine[chunksIdx + 1],
      zombies: zombiesIdx === -1 ? '' : splitLogLine[zombiesIdx + 1],
      entities: entitiesIdx === -1 ? '' : splitLogLine[entitiesIdx + 1],
      players: playersIdx === -1 ? '' : splitLogLine[playersIdx + 1],
      items: itemsIdx === -1 ? '' : splitLogLine[itemsIdx + 1],
      rss: rssIdx === -1 ? '' : splitLogLine[rssIdx + 1],
    };

    returnValue.type = 'memUpdate';
    returnValue.data = memUpdate;
  }

  // A17 Chat
  if (_.startsWith(logLine.msg, 'Chat') && logLine.msg.includes('(from')) {
    /*
    {
       date: '2018-11-20',
       time: '14:38:03',
       uptime: '2274.494',
       msg: 'Chat (from \'76561198028175941\', entity id \'171\', to \'Global\'): \'Catalysm\': blabla',
       trace: '',
       type: 'Log'
    }
    */

    let splitMessage = logLine.msg.split('\'');

    if (logLine.msg.includes('Chat handled by mod')) {
      splitMessage = splitMessage.slice(2);
    }

    let data = {
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg,
      steamId: splitMessage[1],
      entityId: splitMessage[3],
      channel: splitMessage[5],
      playerName: splitMessage[7],
      messageText: splitMessage
        .slice(8)
        .join(' ')
        .replace(':', '')
        .trim()
    };

    // Filter out chatmessages that have been handled by some API mod already
    if ((data.steamId === '-non-player-' && data.playerName !== 'Server') || data.entityId === '-1') {
      returnValue.type = 'logLine';
      returnValue.data = data;
    } else {
      returnValue.type = 'chatMessage';
      returnValue.data = data;
    }

  }

  // pre A17 chat
  if (_.startsWith(logLine.msg, 'Chat:')) {
    /*
    {
      "date": "2017-11-14",
      "time": "14:50:39",
      "uptime": "123.278",
      "msg": "Chat: 'Catalysm': hey",
      "trace": "",
      "type": "Log"
    }
    */

    let firstIdx = logLine.msg.indexOf('\'');
    let secondIdx = logLine.msg.indexOf('\'', firstIdx + 1);
    let playerName = logLine.msg.slice(firstIdx + 1, secondIdx);
    let messageText = logLine.msg.slice(secondIdx + 3, logLine.msg.length);

    let type = 'chat';
    if (playerName === 'Server') {
      type = 'server';
    }

    /*
    Workaround for when the server uses servertools roles
    Server tools
    */
    if (playerName.includes('[-]') && playerName.includes('](')) {
      let roleColourDividerIndex = playerName.indexOf('](');
      let roleEndIndex = playerName.indexOf(')', roleColourDividerIndex);
      let newPlayerName = playerName
        .substring(roleEndIndex + 2)
        .replace('[-]', '');
      playerName = newPlayerName;
    }

    /**
     * Workaround for coppi colours (with the colour ending indicator [-])
     */

    if (playerName.includes('[-]')) {
      let colourEndIdx = playerName.indexOf(']');
      let newPlayerName = playerName
        .substring(colourEndIdx + 1)
        .replace('[-]', '');
      playerName = newPlayerName;
    }

    let data = {
      playerName,
      messageText,
      type,
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg
    };

    returnValue.type = 'chatMessage';
    returnValue.data = data;
  }

  if (connectedRegex.test(logLine.msg)) {
    const connectedArray = logLine.msg.split(',');
    let joinMsg = {
      steamId: connectedArray.find(e => e.includes('steamid')).split('=')[1],
      playerName: connectedArray.find(e => e.includes('name')).split('=')[1],
      entityId: connectedArray.find(e => e.includes('entityid')).split('=')[1],
      ip: connectedArray.find(e => e.includes('ip')).split('=')[1],
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg
    };

    const geoIpLookup = require('geoip-lite').lookup(joinMsg.ip);
    joinMsg.country = geoIpLookup ? geoIpLookup.country : null;

    returnValue.type = 'playerConnected';
    returnValue.data = joinMsg;
  }

  // New player connects
  if (joinedRegex.test(logLine.msg)) {
    /*
    {
      "date": "2019-03-04",
      "time": "14:50:25",
      "uptime": "109.802",
      "msg": "PlayerSpawnedInWorld (reason: EnterMultiplayer, position: -81, 61, -10): EntityID=531, PlayerID='76561198028175941', OwnerID='76561198028175941', PlayerName='Catalysm'",
      "trace": "",
      "type": "Log"
    }
    */

    const joinedArray = logLine.msg.match(joinedValuesRegex);

    let joinMsg = {
      steamId: replaceQuotes(joinedArray[2].replace('OwnerID=', '')),
      playerName: replaceQuotes(joinedArray[3].replace('PlayerName=', '')),
      entityId: joinedArray[0].replace('EntityID=', ''),
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg
    };

    returnValue.type = 'playerJoined';
    returnValue.data = joinMsg;
  }

  if (_.startsWith(logLine.msg, 'Player disconnected:')) {
    /*
    {
      "date": "2017-11-14",
      "time": "14:51:40",
      "uptime": "184.829",
      "msg": "Player disconnected: EntityID=171, PlayerID='76561198028175941', OwnerID='76561198028175941', PlayerName='Catalysm'",
      "trace": "",
      "type": "Log"
    }
    */
    let logMsg = logLine.msg;
    logMsg = logMsg.replace('Player disconnected', '');
    logMsg = logMsg.split(',');

    let entityID = logMsg[0].replace(': EntityID=', '').trim();
    let playerID = logMsg[1]
      .replace('PlayerID=', '')
      .replace(/'/g, '')
      .trim();
    let ownerID = logMsg[2]
      .replace('OwnerID=', '')
      .replace(/'/g, '')
      .trim();
    let playerName = logMsg[3]
      .replace('PlayerName=', '')
      .replace(/'/g, '')
      .trim();

    let disconnectedMsg = {
      entityID,
      playerName,
      ownerID,
      playerID,
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg
    };

    returnValue.type = 'playerDisconnected';
    returnValue.data = disconnectedMsg;
  }

  if (deathRegex.test(logLine.msg)) {
    /*
    {
      "date": "2017-11-14",
      "time": "14:50:49",
      "uptime": "133.559",
      "msg": "PlayerSpawnedInWorld (reason: Died, position: 2796, 68, -1452): EntityID=6454, PlayerID='76561198028175941', OwnerID='76561198028175941', PlayerName='Catalysm'",
      "trace": "",
      "type": "Log"
    }
    */

    let deathArray = logLine.msg.match(deathValuesRegex);
    const deathMessage = {
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg,
      steamId: replaceQuotes(deathArray[2].replace('OwnerID=', '')),
      playerName: replaceQuotes(deathArray[3].replace('PlayerName=', '')),
      entityId: deathArray[0].replace('EntityID=', '')
    };

    returnValue.type = 'playerDeath';
    returnValue.data = deathMessage;
  }

  if (logLine.msg.startsWith('[CSMM_Patrons]playerLeveled:')) {
    /*
    {
      "date": "2017-11-14",
      "time": "14:50:49",
      "uptime": "133.559",
      "msg": "[CSMM_Patrons]playerLeveled: Catalysm (76561198028175941) made level 6 (was 5)",
      "trace": "",
      "type": "Log"
    }
    */

    const steamId = logLine.msg.match(steamIdRegex)[0];
    const newLvl = extractIntegers(logLine.msg.match(newLevelRegex)[0]);
    const oldLvl = extractIntegers(logLine.msg.match(oldLevelRegex)[0]);


    lvlMessage = {
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg,
      steamId: steamId,
      newLvl: newLvl,
      oldLvl: oldLvl
    };

    returnValue.type = 'playerLevel';
    returnValue.data = lvlMessage;
  }

  if (logLine.msg.startsWith('[CSMM_Patrons]entityKilled:')) {
    /*
    {
      "date": "2017-11-14",
      "time": "14:50:49",
      "uptime": "133.559",
      "msg": "[CSMM_Patrons]entityKilled: Catalysm (76561198028175941) killed zombie zombieBoe",
      "trace": "",
      "type": "Log"
    }
    */

    const entityInfo = logLine.msg.match(entityKilledRegex)[0].split(' ');

    killMessage = {
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg,
      steamId: logLine.msg.match(steamIdRegex)[0],
      entityClass: entityInfo[1],
      entityName: entityInfo[2]
    };

    if (killMessage.entityClass === 'zombie') {
      returnValue.type = 'zombieKilled';
    }

    if (killMessage.entityClass === 'animal') {
      returnValue.type = 'animalKilled';
    }

    returnValue.data = killMessage;
  }

  if (gmsgPvPDeathRegex.test(logLine.msg)) {
    /*
    {
      "date": "2017-11-14",
      "time": "14:50:49",
      "uptime": "133.559",
      "msg": "GMSG: Player 'Tricia' killed by 'Catalysm'",
      "trace": "",
      "type": "Log"
    }
    */

    let killMessage = logLine.msg.match(gmsgPvPDeathRegex);

    const victimName = killMessage[1].split('\'').join('');
    const killerName = killMessage[2].split('\'').join('');

    if (victimName === killerName) {
      suicideMessage = {
        date: logLine.date,
        time: logLine.time,
        uptime: logLine.uptime,
        msg: logLine.msg,
        playerName: victimName
      };

      returnValue.type = 'playerSuicide';
      returnValue.data = suicideMessage;
    } else {
      killMessage = {
        date: logLine.date,
        time: logLine.time,
        uptime: logLine.uptime,
        msg: logLine.msg,
        victimName: victimName,
        killerName: killerName
      };

      returnValue.type = 'playerKilled';
      returnValue.data = killMessage;
    }
  }

  if (gmsgDeathRegex.test(logLine.msg)) {
    /*
      GMSG: Player 'Catalysm' died
      GameMessage handled by mod 'CSMM Patrons': GMSG: Player 'Catalysm' killed by 'Catalysm'
    */

    const deathArray = logLine.msg.match(gmsgDeathRegex);
    const playerName = deathArray[1] || deathArray[2];
    const deathMessage = {
      date: logLine.date,
      time: logLine.time,
      uptime: logLine.uptime,
      msg: logLine.msg,
      playerName: playerName,
    };

    returnValue.type = 'playerDied';
    returnValue.data = deathMessage;
  }


  return returnValue;
};
