const chai = require('chai');
const expect = chai.expect;

const handleLogLine = require('../../../../worker/processors/logs/handleLogLine');

describe('sdtdLogs#handleLogLine', () => {
  it('Correctly detects a death event', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:49',
      uptime: '133.559',
      msg:
        'PlayerSpawnedInWorld (reason: Died, position: 2796, 68, -1452): EntityID=6454, PlayerID=\'76561198028175941\', OwnerID=\'76561198028175941\', PlayerName=\'Catalysm\'',
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerDeath');
    expect(result.data.playerName).to.eq('Catalysm');
    expect(result.data.steamId).to.eq('76561198028175941');
    expect(result.data.entityId).to.eq('6454');
  });

  it('Correctly detects a playerConnected event', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:25',
      uptime: '109.802',
      msg:
        'Player connected, entityid=3667, name=Catalysm, steamid=76561198028175941, steamOwner=76561198028175941, ip=2.21.16.8',
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerConnected');
    expect(result.data.playerName).to.eq('Catalysm');
    expect(result.data.steamId).to.eq('76561198028175941');
    expect(result.data.entityId).to.eq('3667');
    // I don't think it makes sense to check the actual country, just that something gets set
    expect(result.data.country).to.not.be.null;
  });

  it('Correctly detects a playerJoined event', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:25',
      uptime: '109.802',
      msg:
        'PlayerSpawnedInWorld (reason: EnterMultiplayer, position: -81, 61, -10): EntityID=531, PlayerID=\'76561198028175941\', OwnerID=\'76561198028175941\', PlayerName=\'Catalysm\'',
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerJoined');
    expect(result.data.playerName).to.eq('Catalysm');
    expect(result.data.steamId).to.eq('76561198028175941');
    expect(result.data.entityId).to.eq('531');
  });

  it('correctly detects a playerLevel event', () => {
    const logLine = {
      'date': '2020-07-11',
      'time': '08:11:40',
      'uptime': '1673.118',
      'msg': '[CSMM_Patrons]playerLeveled: (VE) Kiota (76561198108856299) made level 4 (was 3)',
      'trace': '',
      'type': 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerLevel');
    expect(result.data.steamId).to.eq('76561198108856299');
    expect(result.data.newLvl).to.eq('4');
    expect(result.data.oldLvl).to.eq('3');

  });


  it('correctly detects a zombieKilled event', () => {
    const logLine = {
      'date': '2017-11-14',
      'time': '14:50:49',
      'uptime': '133.559',
      'msg': '[CSMM_Patrons]entityKilled: (VE) Kiota (76561198028175941) killed zombie zombieBoe',
      'trace': '',
      'type': 'Log'
    };
    const result = handleLogLine(logLine);

    expect(result.type).to.eq('zombieKilled');
    expect(result.data.steamId).to.eq('76561198028175941');
    expect(result.data.entityClass).to.eq('zombie');
    expect(result.data.entityName).to.eq('zombieBoe');

  });

  it('correctly detects a animalKilled event', () => {
    const logLine = {
      'date': '2017-11-14',
      'time': '14:50:49',
      'uptime': '133.559',
      'msg': '[CSMM_Patrons]entityKilled: (VE) Kiota (76561198028175941) killed animal cuteBambi',
      'trace': '',
      'type': 'Log'
    };
    const result = handleLogLine(logLine);

    expect(result.type).to.eq('animalKilled');
    expect(result.data.steamId).to.eq('76561198028175941');
    expect(result.data.entityClass).to.eq('animal');
    expect(result.data.entityName).to.eq('cuteBambi');

  });

  it('correctly detects a non-player chatmessage as a logline', () => {
    const logLine = {
      'date': '2017-11-14',
      'time': '14:50:49',
      'uptime': '133.559',
      'msg': `Chat (from '-non-player-', entity id '-1', to 'Global'): 'Server': Catalysm: Server will restart in 13 MINUTES`,
      'trace': '',
      'type': 'Log'
    };
    const result = handleLogLine(logLine);

    expect(result.type).to.eq('logLine');
    expect(result.data.steamId).to.eq('-non-player-');
    expect(result.data.playerName).to.eq('Server');
    expect(result.data.entityId).to.eq('-1');
  });

  it('correctly parses chat messages', () => {
    const logLine = {
      msg: 'Chat (from \'123456789\', entity id \'171\', to \'Global\'): \'Catalysm\':/test',
      type: 'Log',
      trace: '',
    };

    const result = handleLogLine(logLine);
    expect(result.type).to.eq('chatMessage');
    expect(result.data.steamId).to.eq('123456789');
    expect(result.data.playerName).to.eq('Catalysm');
    expect(result.data.entityId).to.eq('171');
    expect(result.data.messageText).to.eq('/test');
  });

  it('Correctly detects a playerDied event with PvE death', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:49',
      uptime: '133.559',
      msg: `GMSG: Player 'Catalysm' died`,
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerDied');
    expect(result.data.playerName).to.eq('Catalysm');
  });

  it('Correctly detects a playerSuicide event', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:49',
      uptime: '133.559',
      msg: `GameMessage handled by mod 'CSMM Patrons': GMSG: Player 'Catalysm' killed by 'Catalysm'`,
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerSuicide');
    expect(result.data.playerName).to.eq('Catalysm');
  });

  it('Correctly detects a playerKilled event', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:49',
      uptime: '133.559',
      msg: `GMSG: Player 'Tricia' killed by 'Catalysm'`,
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.eq('playerKilled');
    expect(result.data.killerName).to.eq('Catalysm');
    expect(result.data.victimName).to.eq('Tricia');
  });

  it('Does not detect this line as a player killed event', () => {
    const logLine = {
      date: '2017-11-14',
      time: '14:50:49',
      uptime: '133.559',
      msg: `GMSG: Player '2skilled4u' joined the game`,
      trace: '',
      type: 'Log'
    };

    const result = handleLogLine(logLine);

    expect(result.type).to.be.eq('logLine');
  });
});
