import {forumTemplate} from './forum-template.js';
import {signIn, initPromise} from './account-info.js';
import {updateBar} from './nav-bar.js';

let signedIn;
let userId;
let userLiked;
let userFilter = 'all';
let topicFilter = 'all';
let sortFilter = 'timestamp';

$( document ).ready( function() {
  // Add user data to forum
  initPromise.then(function() {
    updatePage();
    gapi.auth2.getAuthInstance().isSignedIn.listen(updatePage);
    $('.sign-in').click(function() {
      signIn().then(function() {
        updatePage();
      });
    });
  });

  // Add search and filters functionality
  createSearchAndFilters();

  // Populates filters
  getFilters();

  // Add functionality to post question
  $('#question-button').click(postQuestion);
});

/**
 *  Updates page based on whether the user is signed in
 */
function updatePage() {
  updateBar();
  const auth2 = gapi.auth2.getAuthInstance();

  if (auth2.isSignedIn.get()) {
    // The user is signed in
    signedIn = true;
    userId = auth2.currentUser.get().getBasicProfile().getId();

    // Get user likes and generate forum
    fetch('/account?action=liked&id=' + userId).then((response) =>
      (response.json())).then((json) => {
      userLiked = json;
    }).then(getForum);

    $('#new-question').css('display', 'inline-block');
    $('#new-question-logged-out').css('display', 'none');
    $('.reply-button').css('display', 'inline-block');
    $('#filter-user-label').css('display', 'inline-block');
    $('#filter-user-input').css('display', 'inline-block');
  } else {
    // The user is not signed in
    signedIn = false;
    getForum();
    $('#new-question').css('display', 'none');
    $('#new-question-logged-out').css('display', 'inline-block');
    $('.reply-button').css('display', 'none');
    $('#filter-user-label').css('display', 'none');
    $('#filter-user-input').css('display', 'none');
  }
}

/**
 *  Populates forum-placeholder with forum data
 */
function getForum() {
  const id = -1;
  const placeholder = $('#forum-placeholder');
  expandForum(placeholder, id);
}

/**
 *  Sets value of select if there are set filters from the url parameters
 */
function getFilters() {
  $('#filter-topic-input').val(topicFilter).change();
  $('#filter-sort-input').val(sortFilter).change();
  $('#filter-user-input').val(userFilter).change();
}

/**
 *  Populates the replies for a forum element with the given id
 *  in the placeholder given with no search keywords
 *
 *  @param {S.fn.init} placeholder the div that will hold the forum elements
 *  @param {long} id the long that identifies the parent of the forum
 *  elements
 *  @param {String} search search text from user if applicable
 */
function expandForum(placeholder, id) {
  // Call expandForumWithSearch with the search parameter as null so that
  // no search is considered
  expandForumWithSearch(placeholder, id, null);
}

/**
 *  Populates the replies for a forum element with the given id
 *  in the placeholder given also based on search keywords if present
 *
 *  @param {S.fn.init} placeholder the div that will hold the forum elements
 *  @param {long} id the long that identifies the parent of the forum
 *  elements
 *  @param {String} search search text from user if applicable
 */
function expandForumWithSearch(placeholder, id, search) {
  let questionUserId = '';
  fetch('/forum?action=elements&id=' + id.toString())
      .then((response) => (response.json())).then((elements) => {
        placeholder.empty();
        if (elements.length > 0) {
          fetch('/forum?action=userId&id=' + elements[0].questionId.toString())
              .then((response) => (response.json())).then((user) => {
                questionUserId = user;
              }).then( function() {
                for (let i = 0; i < elements.length; i++) {
                  if (userFilter ==='all' || elements[i].userId === userId) {
                    if (!search || containsSearch(elements[i].text, search)) {
                      createForumElement(placeholder, elements[i],
                          questionUserId);
                    }
                  }
                }
              });
        }
      });
}

/**
 *  Creates a new forum element in the placeholder populated with
 *  fields of the element given
 *
 *  @param {S.fn.init} placeholder the div that will hold the forum elements
 *  @param {ForumElement} element the ForumElement that contains the data for
 *  the element
 *  @param {String} questionUserId the user id of the question element
 */
function createForumElement(placeholder, element, questionUserId) {
  /* Creates a new div and adds it to placeholder */
  const elementDiv = $('<div></div>');
  const elementId = 'outer-element-' + element.id.toString();
  elementDiv.attr('id', elementId);
  placeholder.append(elementDiv);

  let data;
  fetch('/account?action=name&id=' + element.userId).then((response) =>
    (response.json())).then((name) => {
    data = createElementData(element, name, questionUserId);
  }).then(function() {
    const rendered = Mustache.render(forumTemplate, data);
    elementDiv.html(rendered);

    /* Add onclick functionality to mustache render */
    if (signedIn && !userLiked.includes(element.id.toString())) {
      $('#' + elementId + ' .like-button').click(element.id, incrementLikes);
      $('#' + elementId + ' .like-button').css('color', '#4285f4');
      $('#' + elementId + ' .like-button').css('cursor', 'pointer');
    } else {
      $('#' + elementId + ' .like-button').css('color', '#666');
      $('#' + elementId + ' .like-button').css('cursor', 'auto');
      $('#' + elementId + ' .like-button').off('click');
    }

    $('#' + elementId + ' .reply-button').click(element.id, reply);
    $('#' + elementId + ' .expand-button').click(element.id, expandReplies);
    $('#' + elementId + ' .response-button').click(element.id, postComment);
    $('#' + elementId + ' .accept-button').click(element.id, acceptComment);
    $('#collapse-button-' + element.id.toString())
        .click(element.id, collapseReplies);
  });
}

/**
 *  Creates json data for mustache render
 *
 *  @param {ForumElement} element the ForumElement that contains the data for
 *  the element
 *  @param {String} userName the name of the user who posted the element
 *  @param {String} questionUserId the user id of the question element
 *  @return {Object} a populated json object
 */
function createElementData(element, userName, questionUserId) {
  /* If element is a comment or question and thus whether the topic should be
   * displayed */
  let elementType = 'comment';
  let topicDisplay = 'none';
  let acceptedDisplay = 'none';
  let acceptButtonDisplay = 'none';

  if (element.parentId == -1) {
    elementType = 'question';
    topicDisplay = 'inline-block';
  } else if (element.accepted) {
    acceptedDisplay = 'inline-block';
  } else if (questionUserId !== '-1' && questionUserId === userId) {
    acceptButtonDisplay = 'inline-block';
  }

  /* If the element has replies, display expand button if not no display */
  let repliesDisplay = 'block';
  if (element.numberReplies == 0) {
    repliesDisplay = 'none';
  }

  let replyDisplay = 'none';
  if (signedIn) {
    replyDisplay = 'inline-block';
  }

  /* Populate json data for the mustache render */
  const data = {
    elementType: elementType,
    topicDisplay: topicDisplay,
    acceptedDisplay: acceptedDisplay,
    acceptButtonDisplay: acceptButtonDisplay,
    topic: element.topic,
    date: convertTimestampToDate(element.timestamp),
    userName: userName,
    text: element.text,
    likes: element.likes,
    id: element.id,
    replyDisplay: replyDisplay,
    repliesDisplay: repliesDisplay,
    numReplies: element.numberReplies,
  };

  return data;
}

/**
 *  Creates search and filters functionality when page is loaded
 */
function createSearchAndFilters() {
  $('#search-button').click(search);
  $('#search-input').keyup(search);
  $('#filter-button').click(filter);
  $('#filter-form select').on('change', filter);
}

/**
 *  Onclick handler for a user filtering to reload forum with filter parameters
 */
function filter() {
  const topic = $('#filter-topic-input').val();
  topicFilter = topic;
  const sort = $('#filter-sort-input').val();
  sortFilter = sort;
  const user = $('#filter-user-input').val();
  userFilter = user;
  $.post('/forum?action=filter&topic=' + topic + '&userId=' + user +
      '&sort=' + sort).then(getForum);
}

/**
 *  Converts a timestamp in milliseconds into a date based on UTC
 *
 *  @param {long} timestamp the time in milliseconds
 *  @return {String} a String of the time as a date
 */
function convertTimestampToDate(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Add one because the month is zero index
  const year = date.getFullYear();
  return (month + '/' + day + '/' + year);
}

/**
 *  Posts to server to increment likes for a element
 *
 *  @param {S.Event} idHandler onclick handler that contains the id data
 */
function incrementLikes(idHandler) {
  const id = idHandler.data;
  const elementId = 'element-' + id.toString();
  $.post('/forum?id=' + id.toString() + '&action=likes');
  $.post('/account?action=liked&id=' + userId + '&elementId=' + id.toString());
  const likes = parseInt($('#' + elementId + ' .likes').text());
  $('#' + elementId + ' .likes').text(likes + 1);
  $('#' + elementId + ' .like-button').css('color', '#666');
  $('#' + elementId + ' .like-button').css('cursor', 'auto');
  $('#' + elementId + ' .like-button').off('click');
}

/**
 *  Displays the reply form for a given element
 *
 *  @param {S.Event} idHandler onclick handler that contains the id data
 */
function reply(idHandler) {
  const id = idHandler.data;
  const elementId = 'element-' + id.toString();
  $('#' + elementId + ' .response-form').css('display', 'flex');
}

/**
 *  Expands the replies section, fetches from server
 *
 *  @param {S.Event} idHandler onclick handler that contains the id data
 */
function expandReplies(idHandler) {
  const id = idHandler.data;
  const elementId = 'element-' + id.toString();
  const placeholder = $('#replies-' + id.toString());
  placeholder.css('display', 'block');
  expandForum(placeholder, id);
  $('#' + elementId + ' .expand-button').css('display', 'none');
  $('#collapse-button-' + id.toString()).css('display', 'block');
}

/**
 *  Collapses the replies section for a specific element
 *
 *  @param {S.Event} idHandler onclick handler that contains the id data
 */
function collapseReplies(idHandler) {
  const id = idHandler.data;
  const elementId = 'element-' + id.toString();
  $('#replies-' + id.toString()).empty();
  $('#replies-' + id.toString()).css('display', 'none');
  $('#' + elementId + ' .expand-button').css('display', 'inline-block');
  $('#collapse-button-' + id.toString()).css('display', 'none');
}

/**
 *  Onclick handler for a user searching to reload forum with search parameter
 */
function search() {
  const search = $('#search-input').val();
  const id = -1;
  const placeholder = $('#forum-placeholder');
  expandForumWithSearch(placeholder, id, search);
}

/**
 *  Returns whether a word of the search is contained with in the text
 *
 *  @param {String} text contents of a question
 *  @param {String} search contents of the user search
 *
 *  @return {Boolean} whether there is a word of the search within the text
 */
function containsSearch(text, search) {
  const stopWords = ['a', 'to', 'and', 'how', 'the', 'when', 'what', 'why',
    'what', 'where', 'or', 'do', 'can', 'use', 'i', 'you', 'my', 'your'];
  const lowerText = text.toLowerCase();
  const lowerSearch = search.toLowerCase();
  let words = lowerSearch.split(' ');
  words = words.filter( function(word) {
    return ((!stopWords.includes(word)) && (lowerText.includes(word)));
  });
  return (words.length > 0);
}

/**
 *  Post question to datastore
 */
function postQuestion() {
  const text = $('#question-form #text-input').val();
  const topic = $('#question-form #topic-input').val();
  $('#question-form #topic-input').val('Zoom');
  $('#question-form #text-input').val('');
  $.post('/forum?id=-1&action=reply&text=' + text + '&topic=' + topic +
      '&userId=' + userId).then(function() {
    getForum();
  });
}

/**
 *  Post comment basedd on id in idHandler
 *
 *  @param {S.Event} idHandler onclick handler that contains the id data
 */
function postComment(idHandler) {
  const id = idHandler.data;
  const elementId = 'element-' + id.toString();
  const text = $('#' + elementId + ' .text-input').val();
  $('#' + elementId + ' .text-input').val('');
  const numReplies = parseInt($('#' + elementId + ' .num-rep').text());
  $('#' + elementId + ' .num-rep').text((numReplies + 1).toString());
  $.post('/forum?id=' + id.toString() + '&action=reply&text=' + text +
      '&userId=' + userId).then(function() {
    expandReplies(idHandler);
  });
}

/**
 *  Accepts comment based on id in idHandler
 *
 *  @param {S.Event} idHandler onclick handler that contains the id data
 */
function acceptComment(idHandler) {
  const id = idHandler.data;
  const elementId = 'element-' + id.toString();
  $('#' + elementId + ' .accept-button').css('display', 'none');
  $('#' + elementId + ' .accepted').css('display', 'inline-block');
  $.post('/forum?id=' + id.toString() + '&action=accepted');
}
