var sevenDays = require('machinepack-7daystodiewebapi');

module.exports = {

  friendlyName: 'Ban player',

  description: 'Ban a player from the server',

  inputs: {
    playerId: {
      description: 'The ID of the player',
      type: 'number',
      required: true
    },
    reason: {
      description: 'Reason the player gets banned',
      type: 'string'
    },
    duration: {
      description: 'How long to ban the player for',
      type: 'number'
    },
    durationUnit: {
      description: 'Time unit to ban player', //["minutes", "hours", "days", "weeks", "months", "years"]
      type: 'string'
    }
  },

  exits: {
    success: {},
    notFound: {
      description: 'No player with the specified ID was found in the database.',
      responseType: 'notFound'
    }
  },

  /**
   * @memberof Player
   * @method ban
   * @description ban a player
   * @param {string} steamId  Steam ID of the player
   * @param {string} serverId  ID of the server
   */

  fn: async function (inputs, exits) {

    try {


      let player = await Player.findOne(inputs.playerId);
      let server = await SdtdServer.findOne(player.server);
      return sevenDays.banPlayer({
        ip: server.ip,
        port: server.webPort,
        authName: server.authName,
        authToken: server.authToken,
        playerId: player.steamId,
        reason: inputs.reason,
        duration: inputs.duration,
        durationUnit: inputs.durationUnit.toLowerCase()
      }).exec({
        error: function (error) {
          return exits.error(error);
        },
        unknownPlayer: function () {
          return exits.notFound('Cannot ban player, invalid ID given!', {player, server});
        },
        success: function (response) {
          sails.log.info(`API - Player:ban - banned player on server ${inputs.serverId}`, {player, server});
          return exits.success(response);
        }
      });

    } catch (error) {
      sails.log.error(`API - Player:ban - ${error}`, {playerId: inputs.playerId});
      return exits.error(error);
    }




  }
};
