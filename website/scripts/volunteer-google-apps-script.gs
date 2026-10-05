/**
 * Google Apps Script Web App backing the Volunteer form on the static
 * (Hostinger) build of sysa.in. This file is NOT part of the Next.js
 * build — Apps Script runs entirely on Google's servers, unrelated to
 * this repo's build pipeline. It's kept here purely as a reference copy
 * so future maintainers can see exactly what's deployed without needing
 * to open the Apps Script editor first.
 *
 * To deploy/update:
 *   1. Open the Apps Script project bound to the spreadsheet below
 *      (spreadsheet id 1z8sOeblUJnPAD3BeY4a5Fc38DRq7xyMN2fTINRWsfk),
 *      or script.google.com > your existing "Volunteer" project.
 *   2. Paste this entire file's contents into Code.gs (replacing what's
 *      there), keeping every function at the TOP LEVEL — none of these
 *      may be nested inside another function.
 *   3. Save, then Deploy > Manage deployments > (pencil icon on the
 *      active Web App deployment) > Version: "New version" > Deploy.
 *      Editing/saving alone does NOT update the live /exec URL's
 *      behavior — a new deployment version is required every time this
 *      file changes.
 *   4. Confirm deployment settings: Execute as "Me", Who has access
 *      "Anyone".
 *   5. Run `testSheetWrite` once directly in the Apps Script editor
 *      (select it from the function dropdown, click Run) to confirm the
 *      script can actually write to the sheet before trusting any
 *      website submission.
 *
 * The corresponding frontend lives at
 * apps/web/src/components/public/static-volunteer-form.tsx, which POSTs
 * via a hidden iframe-targeted <form> (not fetch()) because this /exec
 * endpoint's response has no CORS headers — confirmed directly against
 * the live endpoint, so fetch() can never read a status/JSON body from
 * it regardless of how the request is shaped.
 */

var SPREADSHEET_ID = '1z8sOeblUJnPAD3BeY4a5Fc38DRq7xyMN2fTINRWsfk';
var NOTIFICATION_EMAIL = 'superadmin@sysa.in';

/** Lets you sanity-check the deployment is live by opening the /exec URL
 * directly in a browser (a GET request) — should show this JSON. */
function doGet(e) {
  return jsonResponse({ success: true, message: 'Volunteer Apps Script is running.' });
}

function doPost(e) {
  try {
    var params = (e && e.parameter) || {};

    // Honeypot: real visitors never fill this hidden field. Bots that
    // blindly fill every input will. Return a normal-looking success so
    // the bot doesn't retry, but never touch the spreadsheet.
    if (getParameter(params, 'website')) {
      return jsonResponse({ success: true, message: 'Thank you!' });
    }

    var name = getParameter(params, 'name');
    var email = getParameter(params, 'email');
    var phone = getParameter(params, 'phone');
    var city = getParameter(params, 'city');
    var interest = getParameter(params, 'interest');
    var availability = getParameter(params, 'availability');
    var message = getParameter(params, 'message');

    var missing = [];
    if (!name) missing.push('name');
    if (!email) missing.push('email');
    if (!phone) missing.push('phone');
    if (!city) missing.push('city');
    if (!interest) missing.push('interest');
    if (!availability) missing.push('availability');

    if (missing.length > 0) {
      return jsonResponse({
        success: false,
        message: 'Missing required field(s): ' + missing.join(', '),
      });
    }

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return jsonResponse({ success: false, message: 'Invalid email address.' });
    }

    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheets()[0];

    // Prevents two near-simultaneous submissions from interleaving their
    // appendRow calls and corrupting a row.
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // Column order matches the sheet header exactly: Full Name, Email
      // Address, Phone Number, City, How Would you like to help?,
      // Availability, Tell Us About Yourself.
      sheet.appendRow([name, email, phone, city, interest, availability, message]);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // The row is already saved at this point — an email failure below
    // must never turn into a false "submission failed" for the visitor.
    try {
      sendNotificationEmail(name, email, phone, city, interest, availability, message);
    } catch (emailError) {
      console.error('Notification email failed: ' + emailError);
    }

    return jsonResponse({
      success: true,
      message: 'Thank you! Your volunteer application has been received.',
    });
  } catch (error) {
    console.error('doPost error: ' + error);
    return jsonResponse({
      success: false,
      message: 'Unable to process your application. Please try again later.',
    });
  }
}

/** Trims and normalizes a single form parameter to a string, tolerating
 * missing keys instead of throwing. */
function getParameter(params, key) {
  var value = params[key];
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function sendNotificationEmail(name, email, phone, city, interest, availability, message) {
  var subject = 'New Volunteer Application — ' + name;
  var body =
    'A new volunteer application was submitted on sysa.in:\n\n' +
    'Full Name: ' + name + '\n' +
    'Email Address: ' + email + '\n' +
    'Phone Number: ' + phone + '\n' +
    'City: ' + city + '\n' +
    'How Would you like to help?: ' + interest + '\n' +
    'Availability: ' + availability + '\n' +
    'Tell Us About Yourself: ' + (message || '(none)') + '\n';
  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
}

/** Run this manually from the Apps Script editor (function dropdown at
 * the top > testSheetWrite > Run) to confirm the script can write to the
 * sheet at all, independent of the web app / website / CORS entirely.
 * Check the sheet afterward for a row starting with "[QA TEST - DELETE]". */
function testSheetWrite() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheets()[0];
  sheet.appendRow([
    '[QA TEST - DELETE] testSheetWrite',
    'qa-test@example.com',
    '9999999999',
    'Test City',
    'general',
    'weekends',
    'This row was added by running testSheetWrite() directly in the Apps Script editor.',
  ]);
  SpreadsheetApp.flush();
  Logger.log('testSheetWrite: row appended successfully to "' + sheet.getName() + '".');
}
