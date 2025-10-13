/**
 * Service Tracking Hub – Outreach Dashboard
 * v0.2
 * Serves the HTML dashboard and exposes dynamic app link helpers.
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Outreach Service Tracking Hub");
}

/**
 * Utility to include partials if you later split up HTML/CSS/JS.
 * Example usage in HTML: <?!= include('css.kiosk'); ?>
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
 * Example: setAppLink('APP_LINK_GRANT_SCHEDULER', 'https://script.google.com/macros/s/.../exec')
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
 * Useful for debugging or an Admin settings page.
 */
function listAppLinks() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const links = Object.keys(props)
    .filter(k => k.startsWith('APP_LINK_'))
    .reduce((acc, k) => ({ ...acc, [k]: props[k] }), {});
  Logger.log(links);
  return links;
}