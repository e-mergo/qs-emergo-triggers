/**
 * E-mergo Events Utility Library
 *
 * @version 20230304
 * @author Laurens Offereins <https://github.com/lmoffereins>
 *
 * @param  {Object} qlik              Qlik API
 * @param  {Object} qvangular         Qlik's Angular implementation
 * @param  {Object} _                 Underscore library
 * @param  {Object} $q                Angular's promise library
 * @param  {Object} translator        Qlik's translation API
 * @return {Object}                   E-mergo Events API
 */
define([
	"qlik",
	"qvangular",
	"underscore",
	"ng!$q",
	"translator"
], function( qlik, qvangular, _, $q, translator ) {
	/**
	 * Holds the reference to the current app's API
	 *
	 * @type {Object}
	 */
	var app = qlik.currApp(),

	/**
	 * Filter method for whether the option should be available
	 *
	 * @param  {Object} option Option details
	 * @return {Boolean} Should we keep the option?
	 */
	optionFilter = function( option ) {
		var keep = true;

		// Remove items based on environment
		if (option.hasOwnProperty("ifDesktop") || option.hasOwnProperty("ifServer")) {
			keep = app.global.isPersonalMode() === (option.ifDesktop || ! option.ifServer);
		}

		return keep;
	},

	/**
	 * Holds the set of available events
	 *
	 * @type {Array}
	 */
	eventOptions = [{
		label: "Field Selected",
		value: "selectField",
		showField: true,
		showValue: true,
		showState: true,
		eitherOrLabel: function( item ) {
			var label;

			// When values are not defined, use Once/Continuous
			if (! item.value || ! item.value.length) {
				label = "Occurence frequency";

			// When values are defined, use Many/Exact
			} else {
				label = "Match type";
			}

			return label;
		},
		eitherOrOptions: function( item ) {
			var options;

			// When values are not defined, use Once/Continuous
			if (! item.value || ! item.value.length) {
				options = [{
					label: "Once",
					value: false,
				}, {
					label: "Continuous",
					value: true
				}];

			// When values are defined, use Fuzzy/Exact
			} else {
				options = [{
					label: "Fuzzy",
					value: false,
				}, {
					label: "Exact",
					value: true
				}];
			}

			return options;
		}
	}, {
		label: "Field Cleared",
		value: "clearField",
		showField: true,
		showValue: true,
		showState: true,
		eitherOrLabel: "Which field?",
		eitherOrOptions: [{
			label: "This",
			value: false,
		}, {
			label: "Other",
			value: true
		}]
	}, {
		label: "Expression Matched",
		value: "matchExpression",
		showValue: true
	}, {
		label: "Variable Set",
		value: "setVariable",
		showVariable: true,
		showValue: true
	}, {
		label: "Theme Changed",
		value: "changeTheme",
		showTheme: true
	}, {
		label: "Sheet Opened",
		value: "openSheet"
	}, {
		label: "Time Passed",
		value: "registerTimer",
		valueLabel: "Interval (seconds)",
		showValue: true,
		eitherOrLabel: "Occurence frequency",
		eitherOrOptions: [{
			label: "Once",
			value: false,
		}, {
			label: "Continuous",
			value: true
		}]
	}].filter(optionFilter),

	/**
	 * Sort handler for items by rank
	 *
	 * @param  {Object} a First item
	 * @param  {Object} b Second item
	 * @return {Number}   Sort order
	 */
	sortByRank = function( a, b ) {
		return parseFloat(a.qData.rank) - parseFloat(b.qData.rank);
	},

	/**
	 * Return a boolean from an expression's result
	 *
	 * @param  {String}  a Expression's result
	 * @return {Boolean}   Does the expression evaluate to true?
	 */
	booleanFromExpression = function( a ) {
		return "undefined" === typeof a || "" === a || isNaN(parseInt(a)) || !! parseInt(a);
	},

	/**
	 * Return a number from an expression's result
	 *
	 * @param  {String}  a Expression's result
	 * @return {Number}    Does the expression evaluate to a number
	 */
	numberFromExpression = function( a ) {
		return "undefined" !== typeof a && ! isNaN(parseInt(a)) ? parseInt(a) : 0;
	},

	/**
	 * Return whether arrays match in content (a contains all of b)
	 *
	 * @param  {Array} a Array with values to search
	 * @param  {Array} b Array to compare
	 * @return {Boolean} Does b contain a?
	 */
	matchArrays = function( a, b ) {
		Array.isArray(a) || (a = [a]);
		Array.isArray(b) || (b = [b]);

		return _.isEmpty(_.difference(b, a));
	},

	/**
	 * Return whether arrays contain the exact same values (a equals b)
	 *
	 * @param  {Array} a Array with values to search
	 * @param  {Array} b Array to compare
	 * @return {Boolean} Do both arrays contain the same values?
	 */
	matchArraysExact = function( a, b ) {
		Array.isArray(a) || (a = [a]);
		Array.isArray(b) || (b = [b]);

		return _.isEmpty(_.difference(a, b)) && _.isEmpty(_.difference(b, a));
	},

	/**
	 * Return whether the array contains any values of another (a contains anything of b)
	 *
	 * @param  {Array} a Array with values to search
	 * @param  {Array} b Array to compare
	 * @return {Boolean} Does the first array contain any values from the second array?
	 */
	arrayContains = function( a, b ) {
		Array.isArray(a) || (a = [a]);
		Array.isArray(b) || (b = [b]);

		return b.reduce( function( retval, i ) {
			return retval || -1 !== a.indexOf(i);
		}, false);
	},

	/**
	 * Return whether the array does not contain any values of another (a does not contain anything of b)
	 *
	 * @param  {Array} a Array with values to search
	 * @param  {Array} b Array to compare
	 * @return {Boolean} Does the first array not contain any values from the second array?
	 */
	arrayNotContains = function( a, b ) {
		Array.isArray(a) || (a = [a]);
		Array.isArray(b) || (b = [b]);

		return b.reduce( function( retval, i ) {
			return retval && -1 === a.indexOf(i);
		}, true);
	},

	/**
	 * Return the list of an item's values
	 *
	 * @param  {Object} item Event item
	 * @return {Array}       Values list
	 */
	getListOfValues = function( item ) {
		return item.value ? item.value.split(";").map( function( value ) {
			return isNaN(value) ? value : Number(value);
		}) : [];
	},

	/**
	 * Return the item's relevant alternate state
	 *
	 * @param  {Object} item    Action item
	 * @param  {Object} context Action context
	 * @return {String} Alternate state
	 */
	getAlternateState = function( item, context ) {
		return (! item.state || ! item.state.length) ? (context && context.layout && context.layout.qStateName || "$") : item.state;
	},

	/**
	 * Holds helper functions for the selectField actions
	 *
	 * @type {Object}
	 */
	selectFieldHelpers = {
		/**
		 * Determine whether any selection is made
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @param  {Object} item The action item
		 * @return {Boolean} Are any selections made?
		 */
		withoutFieldAnySelection: function( prev, obj, item ) {

			// The new selection is different, or the previous selection does not exist, but the current one does
			return item.eitherOr ? (obj.selectedCount && prev.selected !== obj.selected) : (! prev.selectedCount && obj.selectedCount);
		},

		/**
		 * Determine whether the field is selected
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @param  {Object} item The action item
		 * @return {Boolean} Is the field selected?
		 */
		withFieldAnySelection: function( prev, obj, item ) {
			var sumOfCounts = prev.selectedCount + obj.selectedCount;

			// Previous selection does not exist (or update continuously), but the new selection is different
			return (! prev.selectedCount || item.eitherOr) && prev.selected !== obj.selected && 0 !== sumOfCounts;
		},

		/**
		 * Determine whether the specified values are selected
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @param  {Object} item The action item
		 * @return {Boolean} Are the specified values selected?
		 */
		withFieldValuesSelected: function( prev, obj, item ) {
			var values = getListOfValues(item),
			    prevSelected = prev.selected.split("|"),
			    selected = obj.selected.split("|");

			// Exact match: the current selection contains only the values
			if (item.eitherOr) {
				return matchArraysExact(selected, values);

			// Fuzzy match: previous selection does not contain all the values, but the current one does
			} else {
				return ! matchArrays(prevSelected, values) && matchArrays(selected, values);
			}
		}
	},

	/**
	 * Event for applying a field selection
	 *
	 * @param  {Object}  item    Event
	 * @param  {Object}  context Event context
	 * @return {Promise}         Event handlers
	 */
	selectField = function( item, context ) {
		var actionType, state = getAlternateState(item, context),

		/**
		 * Object definition to get the field's selections
		 *
		 * @type {Object}
		 */
		def = {
			selected: {},
			selectedCount: {}
		},

		// Holds a reference to the object id of the session
		objId;

		if (item.field) {

			// How many values are selected?
			if (_.isEmpty(getListOfValues(item))) {
				actionType = "withFieldAnySelection";
				def.selectedCount.qValueExpression = "=GetSelectedCount(".concat(item.field, ", '', '", state, "')");
				def.selected.qStringExpression = "=GetFieldSelections(".concat(item.field, ", '|', 10000, '", state, "')");

			// Which values are selected?
			} else {
				actionType = "withFieldValuesSelected";
				def.selected.qStringExpression = "=GetFieldSelections(".concat(item.field, ", '|', 10000, '", state, "')");
			}

		// Is any field selected?
		} else {
			actionType = "withoutFieldAnySelection";
			def.selectedCount.qValueExpression = "=Len(GetCurrentSelections('.', ': ', ', ', '', '".concat(state, "'))");
			def.selected.qStringExpression = "=GetCurrentSelections('.', ': ', ', ', '', '".concat(state, "')");
		}

		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {
				var prev = { selected: "", selectedCount: 0 };

				// Start session object. The object is created once, but its callback
				// will be run everytime the object's hypercube is refreshed.
				return app.createGenericObject(def, function( obj ) {

					// Store the obj reference
					objId = obj.qInfo.qId;

					// Run actions when the specified action type validates
					if (selectFieldHelpers[actionType](prev, obj, item)) {
						triggerActions();
					}

					// Set holder of the previous value for the next check
					prev = _.extend({}, obj);
				});
			},

			/**
			 * Destroy the event listener
			 *
			 * @return {Void}
			 */
			destroy: function() {
				objId && app.destroySessionObject(objId);
			}
		});
	},

	/**
	 * Return whether other field selections appear in the selection
	 *
	 * Note: `selection` from `=GetCurrentSelections('|')` takes the form of
	 *  - '-' for no values
	 *  - 'Alpha: A' for a single selection
	 *  - 'Alpha: A|Beta: B' for multiple selections
	 *
	 * @param  {String} selection Field selections
	 * @param  {String} field     Field name
	 * @return {Boolean} Are other fields selected?
	 */
	areOtherFieldsSelected = function( selection, field ) {
		selection = (selection.length > 1) ? selection.split("|") : [];

		return selection.map( function( a ) {

			// Get the field part
			return a.substring(0, a.indexOf(":"));
		}).reduce( function( retval, i ) {

			// Whether another than the provided field occurs in the selection
			return retval || (i !== field);
		}, false);
	},

	/**
	 * Holds helper functions for the clearField actions
	 *
	 * @type {Object}
	 */
	clearFieldHelpers = {
		/**
		 * Determine whether all fields were cleared
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @return {Boolean} Are all fields cleared?
		 */
		withoutFieldAllCleared: function( prev, obj ) {

			// Previous selection exists, but the current one does not
			return prev.selected && ! obj.selected;
		},

		/**
		 * Determine whether all other fields were cleared
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @param  {Object} item The action item
		 * @return {Boolean} Are all other fields cleared?
		 */
		withFieldOtherFieldsCleared: function( prev, obj, item ) {
			var prevOther = areOtherFieldsSelected(prev.other, item.field),
			    other = areOtherFieldsSelected(obj.other, item.field);

			// Previous selection exists with other selections, but current selection exists without other selections
			return prev.selected && prevOther && obj.selected && ! other;
		},

		/**
		 * Determine whether the specified field was cleared
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @return {Boolean} Is the specified field cleared?
		 */
		withFieldCleared: function( prev, obj ) {

			// Previous selection exists, but the current one does not
			return prev.selected && ! obj.selected;
		},

		/**
		 * Determine whether the specified values were cleared
		 *
		 * @param  {Object} prev Previous object data
		 * @param  {Object} obj Current object data
		 * @param  {Object} item The action item
		 * @return {Boolean} Are the specified values cleared?
		 */
		withFieldValuesCleared: function( prev, obj, item ) {
			var values = getListOfValues(item),
			    prevSelected = prev.selected.split("|"),
			    selected = obj.selected.split("|");

			// Previous selection contains one of the values, but the current one does not
			return arrayContains(prevSelected, values) && arrayNotContains(selected, values);
		}
	},

	/**
	 * Event for clearing a field selection
	 *
	 * When no field is selected, defaults to clearing all selections.
	 *
	 * @param  {Object}  item    Event
	 * @param  {Object}  context Event context
	 * @return {Promise}         Event handlers
	 */
	clearField = function( item, context ) {
		var actionType, state = getAlternateState(item, context),

		/**
		 * Object definition to get the current selections
		 *
		 * @type {Object}
		 */
		def = {
			selected: {},
			other: {}
		},

		// Holds a reference to the object id of the session
		objId;

		// Get the action type
		if (item.field) {

			// How many values are selected?
			if (item.eitherOr) {
				actionType = "withFieldOtherFieldsCleared";
				def.selected.qValueExpression = "=GetSelectedCount(".concat(item.field, ", '', '", state, "')");

				// Consider other fields
				def.other.qStringExpression = "=GetCurrentSelections('|', ':', ', ', '', '".concat(state, "')");
			} else {

				// How many values are selected?
				if (_.isEmpty(getListOfValues(item))) {
					actionType = "withFieldCleared";
					def.selected.qValueExpression = "=GetSelectedCount(".concat(item.field, ", '', '", state, "')");

				// Which values are selected?
				} else {
					actionType = "withFieldValuesCleared";
					def.selected.qStringExpression = "=GetFieldSelections(".concat(item.field, ", '|', 10000, '", state, "')");
				}
			}

		// Is any field selected?
		} else {
			actionType = "withoutFieldAllCleared";
			def.selected.qValueExpression = "=Len(GetCurrentSelections('.', ': ', ', ', '', '".concat(state, "'))");
		}

		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {
				var prev = { selected: "", other: "" };

				// Start session object. The object is created once, but its callback
				// will be run everytime the object's hypercube is refreshed.
				return app.createGenericObject(def, function( obj ) {

					// Store the obj reference
					objId = obj.qInfo.qId;

					// Run actions when the specified action type validates
					if (clearFieldHelpers[actionType](prev, obj, item)) {
						triggerActions();
					}

					// Set holder of the previous value for the next check
					prev = _.extend({}, obj);
				});
			},

			/**
			 * Destroy the event listener
			 *
			 * @return {Void}
			 */
			destroy: function() {
				objId && app.destroySessionObject(objId);
			}
		});
	},

	/**
	 * Event for matching an expression
	 *
	 * @param  {Object}  item    Event
	 * @param  {Object}  context Event context
	 * @return {Promise}         Event handlers
	 */
	matchExpression = function( item, context ) {
		var unwatcher;

		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {
				var prev = false;

				/**
				 * Instead of recreating a new session object, let's listen for an actualized
				 * expression from the property panel that auto-updates with every engine update.
				 * When the value of the expression updates, trigger the actions when appropriate.
				 *
				 * NB: since the engine's updates already refresh the entire view, there is no need
				 * for running a dedicated `$digest` for this watcher that is out of `$scope`.
				 */
				unwatcher = qvangular.$rootScope.$watch( function() {
					return item.value;
				}, function() {

					// Get updated expression result of a defined expression
					var result = booleanFromExpression(item.value) && (item.value && item.value.length);

					// Prevent continuous triggering: only run when previously the expression was NOT matched.
					if (! prev && result) {
						triggerActions();
					}

					// Set holder of the previous value for the next check
					prev = result;
				});

				return $q.resolve();
			},

			/**
			 * Destroy the event listener
			 *
			 * @return {Void}
			 */
			destroy: function() {
				unwatcher && unwatcher();
			}
		});
	},

	/**
	 * Event for setting a variable value
	 *
	 * @param  {Object}  item    Event
	 * @param  {Object}  context Event context
	 * @return {Promise}         Event handlers
	 */
	setVariable = function( item, context ) {
		var withoutValues = (! item.value || ! item.value.length),

		/**
		 * Object definition to get the variable's value
		 *
		 * @type {Object}
		 */
		def = {
			var: {
				qStringExpression: item.variable
			}
		},

		// Holds a reference to the object id of the session
		objId;

		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {
				var prev = "";

				// Start session object. The object is created once, but its callback
				// will be run everytime the object's hypercube is refreshed.
				return app.createGenericObject(def, function( obj ) {

					// Store the obj reference
					objId = obj.qInfo.qId;

					// Prevent continuous triggering: bail when no change happened
					if (prev === obj.var) {
						return;
					}

					// Release trigger when ...
					// ... any change happened
					if (withoutValues) {
						triggerActions();

					// ... or the value matches exactly
					} else if (! withoutValues && item.value.toString() === obj.var) {
						triggerActions();
					}

					// Set holder of the previous value for the next check
					prev = obj.var;
				});
			},

			/**
			 * Destroy the event listener
			 *
			 * @return {Void}
			 */
			destroy: function() {
				objId && app.destroySessionObject(objId);
			}
		});
	},

	/**
	 * Holds the theme's registered domains and triggers
	 *
	 * @type {Object}
	 */
	themeTriggers = {},

	/**
	 * Holds the single theme's object id of the session
	 */
	themeObjId,

	/**
	 * Initiate the theme change event listener for the domain
	 *
	 * @param  {String} domain Scope domain
	 * @return {Void}
	 */
	mountChangeTheme = function( domain ) {

		// Start theme change event listener when initiated for the first time
		if (_.isEmpty(themeTriggers)) {
			createChangeThemeListener();
		}

		// Register the domain
		if (! themeTriggers[domain]) {
			themeTriggers[domain] = {};
		}
	},

	/**
	 * Start the theme change event listener
	 *
	 * @return {Void}
	 */
	createChangeThemeListener = function() {
		/**
		 * Object definition to get the app's theme
		 *
		 * @type {Object}
		 */
		var def = {
			qAppObjectListDef: {
				qType: "appprops",
				qData: {
					theme: "/theme"
				}
			}
		},

		// Holds the previous theme identifier
		prev = false;

		// Start session object. The object is created once, but its callback
		// will be run everytime the object's listobject is refreshed.
		app.createGenericObject(def, function( obj ) {
			var theme = obj.qAppObjectList.qItems[0].qData.theme;

			// Store the obj reference
			themeObjId = obj.qInfo.qId;

			// Bail when no change happened
			if (prev === theme) {
				return;
			}

			// Run all registered triggers at the same time
			_.flatten(_.values(themeTriggers).map(_.values)).forEach( function( i ) {
				i(theme, prev);
			});

			// Set holder of the previous value for the next check
			prev = theme;
		});
	},

	/**
	 * Stop the theme change event listener
	 *
	 * @param  {String} domain Scope domain
	 * @return {Void}
	 */
	destroyChangeTheme = function( domain ) {

		// Remove the domain's triggers
		themeTriggers[domain] && (delete themeTriggers[domain]);

		// Destroy the session object when no domains remain
		if (_.isEmpty(themeTriggers)) {
			themeObjId && app.destroySessionObject(themeObjId);
		}
	},

	/**
	 * Event for changing the app's Theme
	 * 
	 * @param  {Object}  item    Event
	 * @param  {Object}  context Event context
	 * @return {Promise}         Event handlers
	 */
	changeTheme = function( item, context ) {
		var withoutValues = (! item.theme || ! item.theme.length);

		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {

				// Register the theme trigger
				themeTriggers[this.$id][item.cId] = function( theme, prev ) {

					// Release trigger when ...
					// ... any change happened
					if (withoutValues) {
						triggerActions();

					// ... or the value matches exactly
					} else if (! withoutValues && item.theme === theme) {
						triggerActions();
					}
				};

				return $q.resolve();
			},

			/**
			 * Destroy the event listener
			 *
			 * @return {Void}
			 */
			destroy: function() {
				themeTriggers[this.$id][item.cId] && (delete themeTriggers[this.$id][item.cId]);
			}
		});
	},

	/**
	 * Event for opening the current sheet
	 *
	 * @param  {Object}  item    Event
	 * @param  {Object}  context Event context
	 * @return {Promise}         Event handlers
	 */
	openSheet = function( item, context ) {
		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {
				/**
				 * Consider the 'open sheet' event when the event container (extension object) is
				 * mounted, which means to immediately trigger actions on mount.
				 */
				triggerActions();

				return $q.resolve();
			}
		});
	},

	/**
	 * Holds the timer's registered domains and triggers
	 *
	 * @type {Object}
	 */
	timerTriggers = {},

	/**
	 * Holds the single timer's timeout
	 */
	timerTimeout,

	/**
	 * Initiate the timer for the domain
	 *
	 * @param  {String} domain Scope domain
	 * @return {Void}
	 */
	mountTimer = function( domain ) {

		// Start timer when initiated for the first time
		if (_.isEmpty(timerTriggers)) {
			startTimer();
		}

		// Register the domain
		if (! timerTriggers[domain]) {
			timerTriggers[domain] = {};
		}
	},

	/**
	 * Start the timer
	 *
	 * @return {Void}
	 */
	startTimer = function() {
		var timePassed = 0,

		/**
		 * Run the timer, resolving the timer's promise
		 *
		 * @return {Void}
		 */
		timerRun = function() {
			var i, j;

			// Increment the passed time
			timePassed += 1;

			// Keep a local reference to the passed time. This is used to prevent
			// outside overwriting of the `timePassed` counter variable.
			j = timePassed;

			// Run all registered triggers at the same time
			_.flatten(_.values(timerTriggers).map(_.values)).forEach( function( i ) {
				i(j);
			});

			// Continue time
			timerTimeout = setTimeout(timerRun, 1000);
		};

		// Start time
		timerTimeout = setTimeout(timerRun, 1000);
	},

	/**
	 * Stop the timer
	 *
	 * @param  {String} domain Scope domain
	 * @return {Void}
	 */
	destroyTimer = function( domain ) {

		// Remove the domain's triggers
		timerTriggers[domain] && (delete timerTriggers[domain]);

		// Clear the timeout when no domains remain
		if (_.isEmpty(timerTriggers)) {
			timerTimeout && clearTimeout(timerTimeout);
		}
	},

	/**
	 * Event for passing time
	 *
	 * @param  {Object}  item Event
	 * @return {Promise}      Event handlers
	 */
	registerTimer = function( item ) {

		// Timer vars are evaluated once on registration
		var timerInterval = numberFromExpression(item.value),
		    timerStart = numberFromExpression(item.timePassedStartAfter),
		    timerDuration = numberFromExpression(item.timePassedDuration),
		    timerDone = false;

		return $q.resolve({
			/**
			 * Mount the event listener
			 *
			 * @param  {Function} triggerActions Method to trigger event actions
			 * @return {Promise} Event is mounted
			 */
			mount: function( triggerActions ) {
				var objId = this.$id;

				// Register the timer trigger
				timerTriggers[objId][item.cId] = function( timePassed ) {

					// Require start-after
					if (item.eitherOr && timerStart) {
						timePassed = Math.max(timePassed - timerStart, 0);
					}

					// Require end-before
					if (item.eitherOr && timerDuration && timePassed >= timerDuration) {
						timerDone = true;
					}

					// When the required time is passed, run trigger
					if (timerInterval && timePassed && ! timerDone && 0 === (timePassed % timerInterval)) {

						// Flag whether the timer is done (trigger once)
						timerDone = ! item.eitherOr;

						// Execute the trigger's actions
						triggerActions();
					}

					// Remove this callback from the timer when it is done
					if (timerDone) {
						delete timerTriggers[objId][item.cId];
					}
				};

				return $q.resolve();
			},

			/**
			 * Destroy the event listener
			 *
			 * @return {Void}
			 */
			destroy: function() {
				timerTriggers[this.$id][item.cId] && (delete timerTriggers[this.$id][item.cId]);
			}
		});
	},

	/**
	 * Holds the available event methods
	 *
	 * @type {Object}
	 */
	events = {

		// Field
		selectField: selectField,
		clearField: clearField,
		matchExpression: matchExpression,

		// Variable
		setVariable: setVariable,

		// Theme
		changeTheme: changeTheme,

		// Navigation
		openSheet: openSheet,

		// Time
		registerTimer: registerTimer
	},

	/** Helpers **/

	/**
	 * Show a feedback confirmation modal
	 *
	 * Available options on the `qvConfirmDialog` are:
	 *  - title
	 *  - message
	 *  - icon
	 *  - okLabel
	 *  - cancelLabel
	 *  - hideCancelButton
	 *  - variant
	 *  - closeOnEscape
	 *
	 * The returned dialog object provides the `close()` method as well as the
	 * following promises:
	 *  - opened
	 *  - closed
	 *  - closing
	 *
	 * @param {Object} options Dialog options
	 * @return {Object} The dialog
	 */
	showActionFeedback = function( options ) {
		options.hasOwnProperty("hideCancelButton") || (options.hideCancelButton = true);
		return qvangular.getService("qvConfirmDialog").show(options);
	},

	/**
	 * Return the event item's property
	 *
	 * @param  {Object}  item Action
	 * @param  {Boolean} prop Property to signify for showing
	 * @return {Boolean}      Show panel's property
	 */
	getProperty = function( item, prop ) {
		var i = _.findWhere(eventOptions, { value: item.event });
		return i && i[prop];
	},

	/**
	 * Return whether to show the panel's property
	 *
	 * @param  {Object}  item Action
	 * @param  {Boolean} prop Property to signify for showing
	 * @return {Boolean}      Show panel's property
	 */
	showProperty = function( item, prop ) {
		return !! getProperty(item, prop);
	},

	/**
	 * Return the object in the item's tree for which the property equals
	 * the provided value.
	 *
	 * @param  {Object} item Object tree
	 * @param  {String} prop Property name
	 * @param  {Mixed}  value Value to match
	 * @param  {Array} skip Property names to skip searching
	 * @return {Object|Boolean} Searched object or False when not found
	 */
	findObjByPropValue = function( item, prop, value, skip ) {
		var obj = false, i;

		// Default to skipping the hypercube definition
		skip = skip || ["qHyperCubeDef"];

		// Object is found!
		if (item.hasOwnProperty(prop) && item[prop] === value) {
			obj = item;

		// Walk item's properties
		} else {
			for (i in item) {
				if (item.hasOwnProperty(i) && -1 === skip.indexOf(i)) {
					if (Array.isArray(item[i])) {
						obj = item[i].reduce( function( a, b ) {
							return a || findObjByPropValue(b, prop, value, skip);
						}, false);
					} else if (_.isObject(item[i])) {
						obj = findObjByPropValue(item[i], prop, value, skip);
					}

					if (obj) {
						break;
					}
				}
			}
		}

		return obj;
	},

	/**
	 * Holds the definition of an `event` panel property
	 *
	 * @type {Object}
	 */
	eventsDefinition = {
		event: {
			label: "Event",
			type: "string",
			component: "dropdown",
			ref: "event",
			options: eventOptions
		},
		field: {
			translation: "Common.Field",
			type: "string",
			expression: "optional", // How is this parsed?
			ref: "field",
			show: function( item ) {
				return showProperty(item, "showField");
			}
		},
		variable: {
			translation: "Common.Variable",
			type: "string",
			ref: "variable",
			component: "dropdown",
			options: function() {
				var dfd = $q.defer(),
				    def = {
						qVariableListDef:{
							qType:"variable"
						}
					};

				app.createGenericObject(def).then( function( object ) {
					dfd.resolve(object.layout.qVariableList.qItems.map( function( b ) {
						return {
							value: b.qName,
							label: 50 < b.qName.length ? b.qName.slice(0, 50).concat("&hellip;") : b.qName
						};
					}));
				});

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showVariable");
			}
		},
		theme: {
			translation: "Embed.Dialog.SetTheme",
			type: "string",
			component: "dropdown",
			ref: "theme",
			options: function() {
				var dfd = $q.defer();

				qlik.getThemeList().then( function( items ) {
					dfd.resolve([{
						label: translator.get("properties.selectValue"),
						value: ""
					}].concat(items.map( function( a ) {
						return {
							label: a.name,
							value: a.id
						};
					})));
				});

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showTheme");
			}
		},
		value: {
			label: function( item ) {
				return getProperty(item, "valueLabel") || translator.get("ExpressionEditor.Value");
			},
			type: "string",
			expression: "optional",
			ref: "value",
			defaultValue: "",
			show: function( item ) {
				var show = showProperty(item, "showValue");

				// Hide when no field is selected for the `clearField` event
				if ("clearField" === item.event && ! item.field) {
					show = false;
				}

				return show;
			}
		},
		timePassedStartAfter: {
			label: "Start after (seconds)",
			type: "string",
			expression: "optional",
			ref: "timePassedStartAfter",
			defaultValue: "",
			show: function( item ) {
				var show = "registerTimer" === item.event;

				if (! item.eitherOr) {
					show = false;
				}

				return show;
			}
		},
		timePassedDuration: {
			label: "Duration (seconds)",
			type: "string",
			expression: "optional",
			ref: "timePassedDuration",
			defaultValue: "",
			show: function( item ) {
				var show = "registerTimer" === item.event;

				if (! item.eitherOr) {
					show = false;
				}

				return show;
			}
		},
		state: {
			translation: "AlternateState.SelectState",
			type: "string",
			component: "dropdown",
			ref: "state",
			options: function( item, context ) {
				var states = context.app.layout.qStateNames || [];

				return [{
					value: "",
					translation: "AlternateState.InheritedState"
				}, {
					value: "$",
					translation: "AlternateState.DefaultState"
				}].concat(states.map( function( a ) {
					return {
						value: a,
						label: a
					};
				}));
			},
			defaultValue: "",
			show: function( item ) {
				return showProperty(item, "showState");
			}
		},
		eitherOrOptions: {
			label: function( item ) {
				var label = getProperty(item, "eitherOrLabel") || "";

				if ("function" === typeof label) {
					label = label(item);
				}

				return label;
			},
			ref: "eitherOr",
			type: "boolean",
			component: "buttongroup",
			defaultValue: false,
			/**
			 * Generate options for the buttongroup
			 *
			 * @param  {Object} item The item's layout
			 * @return {Array}
			 */
			options: (function() {
				/**
				 * In the `options` method the initial call has the correct
				 * `item` parameter as the item's layout. However in subsequent
				 * calls the first parameter is replaced by the global extension
				 * layout. It contains all registered items, so there is no
				 * telling which item to get the options from. This is a bug in QS.
				 *
				 * To fix this, the parameter's id is stored in a separate variable
				 * within a closure. The first and subsequent calls will then use
				 * this stored id to use the correct version of the item.
				 */
				var _cId;
				return function( item ) {
					var _item;

					// The actual item is provided. Store its id.
					if (item.hasOwnProperty("cId")) {
						_cId = item.cId;
						_item = item;

					// Find the relevant item by using the stored id
					} else {
						_item = findObjByPropValue(item, "cId", _cId);
					}

					var options = getProperty(_item, "eitherOrOptions");

					// Run callback when provided
					if ("function" === typeof options) {
						options = options(_item);
					}

					return options || [false, true];
				};
			})(),
			show: function( item ) {
				var show = showProperty(item, "eitherOrOptions");

				// Hide when no field is selected or when a value is provided for the `clearField` event
				if ("clearField" === item.event && (! item.field || (item.value && item.value.length))) {
					show = false;
				}

				return show;
			}
		},
		enabled: {
			translation: "Common.Enabled",
			ref: "enabled",
			type: "boolean",
			component: "switch",
			options: [{
				translation: "properties.on",
				value: true,
			}, {
				translation: "properties.off",
				value: false
			}],
			defaultValue: true
		}
	},

	/**
	 * Run logic for mounting events
	 *
	 * @param {Object} $scope The object's scope
	 * @return {Void}
	 */
	mount = function( $scope ) {

		// Start theme listener
		mountChangeTheme($scope.$id);

		// Start global timer
		mountTimer($scope.$id);
	},

	/**
	 * Run logic for destroying events
	 *
	 * @param {Object} $scope The object's scope
	 * @return {Void}
	 */
	destroy = function( $scope ) {

		// Remove theme listener
		destroyChangeTheme($scope.$id);

		// Remove global timer
		destroyTimer($scope.$id);
	};

	return {
		options: events,
		eventsDefinition: eventsDefinition,
		mount: mount,
		destroy: destroy
	};
});
