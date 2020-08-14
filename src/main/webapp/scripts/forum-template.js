var forumTemplate = '<div class="forum-element {{elementType}}">\
<div class="info-element">\
<p class="topic" style="display: {{topicDisplay}}">Topic: {{topic}}</p>\
<p class="accepted" style="display: none">Accepted Answer</p>\
<button class="accept-button" style="display: none">Accept Answer</button>\
<p class="date">{{date}}</p>\
<p class="user">User Name</p>\
</div>\
<h3 class="text">{{text}}</h3>\
<div class="options-element">\
<p class="likes-label">Likes: <i class="like-button fa fa-thumbs-up" style="font-size:30px"></i></p>\
<p class="likes">{{likes}}</p>\
<button class="reply-button">Reply</button>\
<form class="response-form" style="display: none" action="/forum?id={{id}}&amp;action=reply" method="POST">\
<input type="text" class="text-input" name="text">\
<input type="submit" value="Post">\
</form>\
<button class="expand-button" style="display: {{repliesDisplay}}">See {{numReplies}} Replies</button>\
</div>\
<div class="replies" id="replies-{{id}}" style="display: none"></div>\
<button class="collapse-button" style="display: none">Hide Replies</button>\
</div>';

export {forumTemplate};
