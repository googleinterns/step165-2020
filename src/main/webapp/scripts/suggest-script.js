/**
 * Posts to server the suggestion made by the user
 */
/*ignore jslint start*/
function makeSuggestion() {
  const platElem = document.getElementById('platform').value;
  const addElem = document.getElementById('addition').value;
  $.post('/new-suggestion?platform=' + platElem + '&addition=' + addElem);

  // clears fields after submission
  document.getElementById('platform').value = '';
  document.getElementById('addition').value = '';
}
/*ignore jslint end*/ 