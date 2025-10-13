/**
 * Service Tracking Hub – Outreach Dashboard
 * v0.3.1
 * Serves the main Hub Dashboard and all dynamic app tiles.
 * Includes new "Daily Pantry Apps" sub-section.
 *
 * ──────────────────────────────────────────────────────────────
 * Script Properties Used for App Links:
 *
 *  Pet Food Pantry
 *   • APP_LINK_SUPPLIES_GIVEN
 *   • APP_LINK_INTERNAL_PANTRY_FORM
 *   • APP_LINK_DAILY_PANTRY
 *
 *  Daily Pantry Subsection
 *   • APP_LINK_PANTRY_G&G
 *   • APP_LINK_NOTIFY
 *
 *  Scheduling
 *   • APP_LINK_GRANT_SCHEDULER
 *   • APP_LINK_SHELTER_APPOINTMENTS
 *   • APP_LINK_HOME_VISITS
 *   • APP_LINK_CLINIC_ADDON
 *
 *  Medical
 *   • APP_LINK_MED_UPLOAD
 *   • APP_LINK_VACCINE_SUBSIDY
 *   • APP_LINK_LIPSEY_INVOICE
 *
 *  Connections
 *   • APP_LINK_FOLLOWUP
 *   • APP_LINK_VOICEMAIL
 *
 *  Reporting Tools
 *   • APP_LINK_GRANT_DASHBOARD
 *   • APP_LINK_MONTHLY_REPORTS
 *   • APP_LINK_ADMIN_REPORTS
 *
 * ──────────────────────────────────────────────────────────────
 * Utility functions:
 *   getAppLink(propName) → Returns a configured URL for a given property.
 *   setAppLink(propName, url) → Sets or updates a property (manual/admin use).
 *   listAppLinks() → Returns all current APP_LINK_* properties.
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Outreach Service Tracking Hub");
}

/**
 * Utility: include() allows inline templating of other HTML/CSS/JS files.
 * Example usage: <?!= include('css.kiosk'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns a configured app link from Script Properties.
 * Used by the dashboard to build dynamic app tiles.
 */
function getAppLink(propName) {
  try {
    const props = PropertiesService.getScriptProperties();
    const value = props.getProperty(propName);
    if (!value) {
      Logger.log(`App link not found for ${propName}`);
      return null;
    }
    return value;
  } catch (err) {
    Logger.log(`Error reading property ${propName}: ${err}`);
    return null;
  }
}

/**
 * Optional admin helper to update an app link from the console.
 * Example:
 *   setAppLink('APP_LINK_GRANT_SCHEDULER', 'https://script.google.com/macros/s/.../exec')
 */
function setAppLink(propName, url) {
  try {
    if (!propName || !url) throw new Error('Missing property name or URL.');
    PropertiesService.getScriptProperties().setProperty(propName, url);
    Logger.log(`Set ${propName} = ${url}`);
    return true;
  } catch (err) {
    Logger.log(`Error setting ${propName}: ${err}`);
    return false;
  }
}

/**
 * Lists all current Script Properties that start with "APP_LINK_".
 * Useful for debugging or building an Admin Settings dashboard.
 */
function listAppLinks() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const links = Object.keys(props)
    .filter(k => k.startsWith('APP_LINK_'))
    .reduce((acc, k) => ({ ...acc, [k]: props[k] }), {});
  Logger.log(links);
  return links;
}