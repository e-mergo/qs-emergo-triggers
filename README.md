---
Type: Qlik Sense Visualization Extension
Name: E-mergo Triggers
Version: 1.4-beta
QEXT: qs-emergo-triggers.qext
---

# E-mergo Triggers

**E-mergo Triggers** is a Qlik Sense visualization extension created by [E-mergo](https://www.e-mergo.nl). This extension enables the dashboard designer to insert event listeners that trigger actions each time the events happen. Among the selectable events are changes in field selections, changes in measure values, and sheet navigation.

This extension is part of the [E-mergo Tools bundle](https://www.e-mergo.nl/e-mergo-tools-bundle/?utm_medium=download&utm_source=tools_bundle&utm_campaign=E-mergo_Extension&utm_term=toolsbundle&utm_content=sitelink).

This extension is [hosted on GitHub](https://github.com/e-mergo/qs-emergo-triggers). You can report bugs and discuss features on the [issues page](https://github.com/e-mergo/qs-emergo-triggers/issues).

## Why is this extension needed?
As per version September 2018, Qlik Sense enables the setting of *default bookmarks* as part of 'advanced authoring'. Default bookmarks are effectively a trigger that consists of an action 'selecting field values' which is run on the event 'open app'. In Qlik Sense, this is the only single event listener for which a single action can be triggered.

This extension provides a set of multiple event listener types as well as multiple actions to attach to them, enabling more flexible interactivity between the various parts of the app. Some scenario's that can be realised with this extension are:
- When opening a sheet, remove all current selections and select the current year
- When selecting a field value, update a variable value
- When an expression's value gets below the set threshold, select a field's adjacent value
- When a variable value is set, change the current theme
- When some time has passed, navigate to the next sheet

## Disclaimer
This extension is created free of charge for Qlik Sense app developers, personal or professional. E-mergo developers aim to maintain the functionality of this extension with each new release of Qlik Sense. However, this product does not ship with any warranty of support. If you require any updates to the extension or would like to request additional features, please inquire for E-mergo's commercial plans for supporting your extension needs at support@e-mergo.nl.

On server installations that do not already have it registered, the Markdown file mime type will be registered when opening the documentation page. This is required for Qlik Sense to be able to successfully return `.md` files when those are requested from the Qlik Sense web server. Note that registering the file mime type is only required once and is usually only allowed for accounts with RootAdmin level permissions.

## Features
Below is a detailed description of the available features of this extension.

### Triggers
Create a set of triggers. Do this by adding triggers one by one through the *Add Trigger* button.

Actions of a trigger may fire events that release other triggers. Triggers may run simultaneously. When setting up triggers be aware to not create infinite action loops.

`Note that triggers are only effective for the sheet on which they are registered.`

`Note that trigger actions might affect the selection history. Also, navigating the selection history might (re-)trigger actions.`

### Label
The trigger label is used as an identifier and as a means to organize the set of triggers on the extension object. A label prefixed with `//` signals that the trigger is disabled.

### Run trigger if
Works like conditional show in the Table and Pivot Table visualizations. Using the expression field for conditional run, the trigger can be run depending on a measure's value, a variable's value or any other comparison. This effectively enables an additional threshold which sanctions the trigger. Return a non-empty falsey value (usually zero) to block the trigger from running, otherwise the trigger is always run on the selected event.

### Event
Select on which event the trigger should listen for triggering its actions. Some event types require additional parameters:
- **Field Selected** The trigger is run when a field selection is applied.
  - **Field** When not providing a Field value, the event applies to *any* field selection.
  - **Value** When not providing a Value, the event applies to *any* selection on the specified field. Separate multiple values with a `;`.
  - **Once/Continuous** When selecting *Once*, the event only applies to the first selection in all fields/the specified field. When selectin *Continuous*, the event applies to any selection in all fields/the specified field.
  - **Fuzzy/Exact** When selecting *Fuzzy* the event applies when the specified values are selected, regardless of other values selected in the field. When selecting *Exact* the event applies only when exactly the specified values are selected.
- **Field Cleared** The trigger is run when a field selection is cleared.
  - **Field** When not providing a Field value, the event applies to *all* fields being cleared, meaning when there are no longer any active selections.
  - **Value** When providing a Field and Value, the event applies to clearing the specified value on the specified field.
  - **This/Other** When selecting *This*, the event applies to clearing the specified field. When selecting *Other*, the event applies to all fields being cleared but the specified field.
- **Expression Matched** The trigger is run when the expression returns a valid value.
  - **Value** Return a non-zero, non-empty value to trigger the event, otherwise the event is not triggered. Prepend an expression with `=` for the engine to process the expression.
- **Variable Set** The trigger is run when a variable's value is changed. Note that this concerns the actual value of the variable, not the result of any expression which the variable might contain. For checking the result of a variable's expression, use the *Expression Matched* event type.
  - **Value** When not providing a Value, the event applies to *any* value change on the specified variable.
- **Theme Changed** The trigger is run when the app's theme is changed.
- **Sheet Opened** The trigger is run when the current sheet is opened.
- **Time Passed** The trigger is run when a specified time is passed since the opening of the sheet.
  - **Interval** Return a number in seconds that counts as the time window between each trigger, starting from the opening of the sheet. Note that the first second is usually skipped due to the time required for loading up all objects on the sheet.
  - **Start After** Return a number in seconds which will act as a starting delay of the timer. This setting is available in the *Continuous* mode.
  - **Duration** Return a number in seconds which will act as a duration window after which the timer will be ignored. This settings is available in the *Continuous* mode.
  - **Once/Continuous** When selecting *Once*, the event only applies to the first passing of the specified time. When selectin *Continuous*, the event applies to each passing of the specified time after another.

### Actions
Listening for an event may trigger one or multiple sequenced actions. The list of actions contains all the current ones present in the extensions provided with the *Qlik Dashboard bundle* shipped with Qlik Sense, and some new ones as well.

  IMPORTANT: When providing values in an expression, be aware that the setting will first be evaluated before it is used by the extension. So when providing plain values, either make sure to define them *without* the leading `=` or otherwise as explicit text by surrounding the value with single quotes. This does apply to settings for FIELD NAMES as well.

The following actions are available:
- **Apply Bookmark** You can pick from a list of available bookmarks in the current app.
- **Select Field Value** You can define both the field and the value as a result from an expression. Also, either decide to replace current selections, or add/subtract the selected value in *Toggle* mode. Separate multiple values with a `;`.
- **Clear Field Selection** When not defining the field, all fields will be cleared.
- **Back or Forward**
- **Lock or Unlock Field** When not defining the field, all fields will be (un)locked.
- **Select All Values**
- **Select Possible Values**
- **Select Alternative Values**
- **Select Excluded Values**
- **Set Variable Value** You can pick from a list of available variables in the current app.

Additional actions are:

#### Select Adjacent Values
This action selects the given field's value that is adjacent to the current selection on that field. Without current selections, the first (next) or last (previous) value is selected. When no sorting expression is provided, the default sorting is applied, which usually is ascending alphabetical or numeric. This functionality allows for skipping through a field's values, without explicitly looking up those values in a filter box or otherwise.

#### Select Pareto Values
This action selects the given field's values that make up the defined pareto set for the given measure expression. You can decide whether or not to include the threshold value of the pareto set. This functionality is native to QlikView, but is not yet implemented in Qlik Sense.
- **Field** The dimension field on which to apply the pareto selection.
- **Value** The measure definition for which to determine the pareto set. Like all action expressions, the setting will first be evaluated before use in the extension. So when providing plain values, make sure to define them *without* a leading `=` or as explicit text surrounded by single quotes.
- **Threshold** The size of the pareto set in percentages. The size represents the set of dimension field values that make up the given percentage of the total value of the measure expression. These are the values that will be selected.
- **Include threshold** Whether the last field that is associated with the pareto set should be selected or not, as it may add to a larger percentage set than the defined threshold value.

#### Start Reload
This action starts a reload of the current app. The reload is started instantly. The reload can be cancelled by clicking the 'Abort' button. Once the reload is executed successfully, the app will be saved with the newly loaded data.
- **Complete/Partial** When selecting *Partial*, a partial reload will be performed.
- **Close on success** When selected, the reload feedback will be closed instantly on reload success. This enables chaining multiple actions after reloading the app.

#### Start Reload Task
This action starts the specified reload task from the QMC. When the task is already running, a message will show telling the user. You can pick from a list of available tasks in the current server environment. This functionality allows for starting reload tasks outside of the QMC.
- **Display progress** When selecting *Enforced*, the user cannot close the modal untill the task execution is done. When selecting *Optional*, the user can close the modal before the task execution is done.
- **Skip task confirmation** When selected, the task will be started instantly.
- **Close on success** When selected, the task feedback will be closed instantly on task success. In combination with *Enforced* progress display and *Skip task confirmation* this enables chaining multiple task executions with actions.

Note that the following requirements apply:
- **Environment** This action is only available in a Qlik Sense server environment, where reload tasks can be created and started.
- **Security Rules** In order for a user to be able to use this action, the user *must have a Professional license* and the proper security rules need to be in place. A message 'Forbidden' will appear if insufficient access is enabled. When the user does not have the RootAdmin role, the user will need to have:
  - *Update access* in the QMC to the app that will be reloaded with the specified reload task: `App_{guid}` or `App_*` for all apps.
  - *Read access* in the QMC to the specified reload task: `ReloadTask_{guid}` or `ReloadTask_*` for all reload tasks.
  - *Read access* in the QMC to `ExecutionResult_*,ExecutionSession_*` in order to keep track of a task's progress (when progress display is *Enforced* or *Optional*).
  - *Read access* in the QMC to `FileReference_*` in order to be able to download the script log file when the task failed.

#### Apply Theme
This action sets the current Qlik Sense visual theme to the specified theme. You can pick from a list of available themes in the current app. This functionality allows for theme-switching for use cases like font-scaling, different color tones, etcetera.

#### Call REST API
This action sends a request to a REST API. As this is a simple implementation of sending an HTTP request, interpretation of the response content is up to the developer. The response content will be parsed into a JSON string and stored in the selected variable. The following parameters of the request are configurable:
- **Location** The URI to send the request to.
- **Method** The HTTP method of the request.
- **Headers** Additional HTTP headers to send with the requst.
- **Body** The optional request body. The provided string will be interpreted as a JSON object.
- **Response** Handling of the response data. Options are:
  - *Generic response* to store the entire response content into a **Variable**.
  - *JSON response* to store any number of properties from the JSON response following a **Path** into a **Variable**. The lookup path must be specified according to [RFC 6901](https://datatracker.ietf.org/doc/html/rfc6901).

Note that when using this action in Qlik Cloud the requested resource locations need to be allowlisted in the Content Security Policy (CSP) administration section (as `connect-src`). Refer to your tenant's administrator when you have no permission to create new CSP entries.

#### Log to Console
This action logs the result of the provided expression to the browser's console. This functionality is provided for debugging purposes.

#### Request Confirmation
This action displays a dialog modal requesting the user's confirmation. When the user selects 'OK' the next action will be started. When the user selects 'Cancel' the action chain will be stopped. Use this action to confirm user intent when events are triggered. Alternatively, the action can be used to display an information modal with limited layout options.

#### Delay Execution
This action adds a timed delay to the execution of the action chain. The duration of the delay is defined through an expression which should return a number of milliseconds (ms). When an invalid value is returned from the expression, the default delay of 1000 ms is applied.

#### Continue or Terminate
This action allows for determining whether to continue the action chain or temrinate it. Based on a measure's value, a variable's value or any other comparison, any non-empty falsey value (usually zero) will terminate the action chain. When the expression evaluates to a truthy value, the execution of actions will continue.

### Navigation
After all triggered actions are successfully handled, a navigation action may kick in to move the user to a different location. The following navigation options are available:
- **Navigate to a specified sheet** You can pick from a list of available sheets in the current app.
- **Navigate to the first sheet**
- **Navigate to the previous sheet**
- **Navigate to the next sheet**
- **Navigate to the last sheet**
- **Navigate to a different app** Additionally, you can select a specific sheet from the selected app.
- **Start a Story** You can pick from a list of available stories in the current app.
- **Navigate to a URI**
- **Switch to Edit mode**

## FAQ

### Can I get support for this extension?
E-mergo provides paid support through standard support contracts. For other scenarios, you can post your bugs or questions in the extension's GitHub repository.

### Can you add feature X?
Requests for additional features can be posted in the extension's GitHub repository. Depending on your own code samples and the availability of E-mergo developers your request may be considered and included.

## Changelog

#### 1.4-beta - QS November 2022
- Ready for Qlik Cloud.
- Renamed extension label to improve discoverability in the extensions list.
- Added the _Theme Changed_ event.
- Added the _Call REST API_ action.
- Added the _Delay Execution_ action.
- Added the _Continue or Terminate_ action.
- Added the _Continuous_ option for the _Field Selected_ event when no field is specified.
- Fixed parsing actions in between action executions, so that subsequent actions are re-evaluated with engine updates.
- Fixed chaining actions and navigation. Broken action chains will no longer trigger navigation.
- Fixed breaking the action chain when the _Request confirmation_ dialog is still active. This prevents infinitely overlapping dialogs for the _Time Passed_ event.
- Fixed bugs in listening for the _Field Selected_ and _Field Cleared_ events.
- Fixed execution of actions when in noInteraction or noSelections mode.
- Fixed sorting of actions.
- Updated docs files.

#### 1.3.20200918 - QS September 2022
- Added the _Request confirmation_ action.
- Fixed firing of the _Field Selected_ event when 0 values are selected.
- Fixed accidental double registration of event listeners.
- Fixed registration of event triggers when the trigger is enabled/disabled.

#### 1.2.20200731
- Added detection of invalid field names in actions.
- Fixed selection of stories for _Start Story_ navigation action.
- Fixed enabling/disabling of individual actions.
- Fixed use of translated labels for settings where possible.
- Fixed logic for the _Open Documentation_ button.

#### 1.1.20200713
- Added _Start After_ and _Duration_ settings for the _Time Passed_ event.
- Added the _Log to Console_ action.
- Fixed the execution of triggers for the _Time Passed_ event to run in parallel.
- Fixed selection of Dual values for the _Select Adjacent Value_ action.

#### 1.0.20200623
- Updated docs files.

#### 1.0.20200622 - QS June 2020
- Fixed use of deprecated contentApi service.

#### 0.5.20191213
- Added support for Alternate States in selection events.
- Fixed logic for determining whether any field selection was applied.

#### 0.4.20191015
- Added support for Alternate States in selection actions.

#### 0.3.20190910
- Fixed issue where the documentation page would not be available on server installations, due to incorrect mime type registration.

#### 0.2.20190909
- Fixed potential issue when multiple trigger extensions on a page would have conflicting timers.
- Semi-fixed issue where property panel options are dynamically defined. A fix is expected in QS November 2019.

#### 0.1.20190905
Initial release.
