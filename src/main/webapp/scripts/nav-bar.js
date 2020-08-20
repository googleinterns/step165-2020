/** Dynamically sets the content of the log in/ log out button */
import {signOut, signIn, initPromise} from './account-info.js';

$(document).ready(function() {
  $('#nav-placeholder').load('../nav.html', updateBar);
  initPromise.then(function() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.isSignedIn.listen(updateBar);
  });
});

/**
 * Updates the nav bar based on the login state.
 */
function updateBar() {
  var auth2 = gapi.auth2.getAuthInstance();
  
  if (auth2.isSignedIn.get()) {
    $('#login').text('Log Out');
    $('#login').off();
    $('#login').click(signOut);
  } else {
    $('#login').text('Log In');
    $('#login').off();
    $('#login').click(signIn);
  }
}

export {updateBar};
