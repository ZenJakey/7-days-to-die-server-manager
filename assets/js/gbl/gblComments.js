class gblComments {
  constructor() {
    this.listElement = $("#comments-list");
    // Map of comments, indexed by ID
    this.commentsMap = new Map();
  }

  clear() {
    this.commentsMap.forEach(comment => {
      $(`#comment-${comment.id}`).fadeOut('fast', () => {
        $(`#comment-${comment.id}`).remove();
      });
    });


    this.commentsMap.clear();
  }

  add(comment, ban) {
    console.log('Drawing a new comment' + JSON.stringify(comment))
    if (_.isUndefined(comment.user)) {
      throw new Error("You must provide a user with the comment to add");
    }

    if (_.isUndefined(ban)) {
      throw new Error("You must provide a ban with the comment to add");
    }


    let dateCreated = new Date(comment.createdAt);

    let containers1 = `<li id="comment-${comment.id}"><div class="comment-main-level">`
    let avatarElement = `<div class="comment-avatar"><img src="${comment.user.avatar}" alt=""></div>`
    let containers2 = `<div class="comment-box"><div class="comment-head">`
    let authorContainer;

    if (comment.user.steamId === ban.steamId) {
      authorContainer = `<h6 class="comment-name by-author"><p>${comment.user.username}</p></h6>`
    } else {
      authorContainer = `<h6 class="comment-name"><p>${comment.user.username}</p></h6>`
    }

    let createdElem = `<span>${dateCreated.toLocaleDateString()} ${dateCreated.toLocaleTimeString()}</span>`
    let heartElem = `<i class="fa fa-heart"></i>`
    let containers3 = `</div>`
    let commentElem = `<div class="comment-content">${comment.content}</div>`
    let containers4 = `</div></div></li>`

    let elementString = containers1 + avatarElement + containers2 + authorContainer + createdElem + heartElem + containers3 + commentElem + containers4

    this.listElement.append($(elementString)).hide().fadeIn(500);
    this.commentsMap.set(comment.id, comment);
  }

  remove(comment) {

    if (_.isUndefined(comment)) {
      throw new Error('Comment is required');
    }

    if (_.isUndefined(comment.id)) {
      comment.id = comment;
    }

    let commentElement = $(`li #comment-${comment.id}`);
    commentElement.remove();
    this.commentsMap.delete(comment.id);
  }
}
