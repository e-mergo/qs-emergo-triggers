/**
 * E-mergo Triggers Extension
 *
 * @since 20180821
 * @author Laurens Offereins <https://github.com/lmoffereins>
 *
 * @param  {Object} $q            Angular's promise library
 * @param  {Object} props         Property panel definition
 * @param  {Object} initProps     Initial properties
 * @param  {Object} emergoEvents  E-mergo Events API
 * @param  {Object} emergoActions E-mergo Actions API
 * @param  {Object} util          E-mergo utility functions
 * @param  {String} css           Extension stylesheet
 * @param  {String} tmpl          Extension template file
 * @return {Object}               Extension structure
 */
define([
	"ng!$q",
	"./properties",
	"./initial-properties",
	"./util/qs-emergo-events",
	"./util/qs-emergo-actions",
	"./util/util",
	"text!./style.css",
	"text!./template.ng.html"
], function( $q, props, initProps, emergoEvents, emergoActions, util, css, tmpl ) {

	// Add global styles to the page
	util.registerStyle("qs-emergo-triggers", css);

	/**
	 * Extension controller function
	 *
	 * @param  {Object} $scope Extension scope
	 * @return {Void}
	 */
	var controller = ["$scope", function( $scope ) {

		/**
		 * Holds the list of event objects (from triggers)
		 *
		 * @type {Array}
		 */
		var events = [],

		/**
		 * Cache functions for this controller
		 *
		 * @type {Object} Cache functions
		 */
		cache = util.createCache("qs-emergo-triggers/" + $scope.$id),

		/**
		 * Deregister method after registering scoped extension object css
		 *
		 * @type {Function}
		 */
		deregisterStyle = util.registerObjStyle($scope.layout.qInfo.qId, {
			hideNav: true // Hide the object's nav items
		});

		/**
		 * Trigger select handler
		 *
		 * @param {Object} trigger Trigger data
		 * @return {Void}
		 */
		$scope.do = function( trigger ) {

			// Run triggers when not editing the sheet
			if (! $scope.object.inEditState()) {
				emergoActions.doMany(trigger, $scope).then( function() {

					// Evaluate navigation settings
					emergoActions.doNavigation(trigger, $scope);
				});
			}
		};

		/**
		 * Run setup methods on all event listeners
		 *
		 * @param {Array} triggerIds Optional. Trigger ids for which to setup event listeners. Defaults to all triggers.
		 * @return {Promise} Event listeners are setup
		 */
		$scope.setupEventListeners = function( triggerIds ) {
			var setupable = [];

			// Get the selected triggers from the extension's layout
			if (! _.isEmpty(triggerIds)) {
				setupable = $scope.layout.props.triggers.filter( function( i ) {
					return -1 !== triggerIds.indexOf(i.cId);
				});

			// Get all registered triggers from the extension's layout
			} else if ("undefined" === typeof triggerIds ) {
				setupable = $scope.layout.props.triggers;
			}

			// Walk all setupables
			return setupable.reduce( function( promise, trigger ) {
				return promise.then( function() {
					var setupTrigger = emergoEvents.options[trigger.event];

					/**
					 * Setup event listener by mounting it's trigger logic
					 *
					 * The `setupTrigger` method uses the registered layout properties in the `trigger` object
					 * to setup the event listener. Using the `mount` method on the trigger's `event` object
					 * the eventual do-action callback gets registered. This callback first checks at the moment
					 * the actual event is fired whether the trigger's conditions are still met (enabled,
					 * run-trigger-if).
					 */
					return setupTrigger && setupTrigger(trigger, $scope).then( function( event ) {
						var dfd = $q.defer();

						// Add event to the set of registered events
						if (event) {
							event.cId = trigger.cId;
							events.push(event);
						}

						// Mount event listener
						if (event && event.mount) {
							event.mount.call($scope, function() {

								// Get the fresh trigger data from the layout at this point. Various parts of the
								// trigger data could have been re-evaluated in between mounting and triggering.
								var a = $scope.layout.props.triggers.find( function( i ) {
									return i.cId === trigger.cId;
								});

								// Run trigger when it is enabled and considered active
								if (a && a.enabled && isTriggerActive(a)) {
									$scope.do(a);
								}
							}).then(dfd.resolve).catch(console.error);
						} else {
							dfd.resolve();
						}

						return dfd.promise;
					});
				});
			}, $q.resolve());
		};

		/**
		 * Run destroy methods on event listeners
		 *
		 * @param {Array} triggerIds Optional. Trigger ids of which to destroy their event listeners. Defaults to all triggers.
		 * @return {Promise} Event listeners are destroyed
		 */
		$scope.destroyEventListeners = function( triggerIds ) {
			var destroyable = [];

			// Get the registered events for selected triggers
			if (! _.isEmpty(triggerIds)) {
				destroyable = events.filter( function( event ) {
					return !! triggerIds.find( function( cId ) {
						return cId === event.cId;
					});
				});

			// Get all registered events
			} else if ("undefined" === typeof triggerIds) {
				destroyable = events;
			}

			// Walk all destroyables
			return destroyable.reduce( function( promise, event ) {
				return promise.then( function() {

					// Run destroy sequence for the event
					if ("function" === typeof event.destroy) {
						event.destroy.call($scope);
					}

					// Remove this event
					events = _.reject(events, function( i ) {
						return i.cId === event.cId;
					});
				});
			}, $q.resolve());
		};

		/**
		 * Reset methods on all event listeners
		 *
		 * @return {Promise} Event listeners are reset
		 */
		$scope.resetEventListeners = function() {
			return $scope.destroyEventListeners().then( function() {
				return $scope.setupEventListeners();
			});
		};

		/**
		 * Return the text displaying the registered trigger count
		 *
		 * @return {String} Trigger count message
		 */
		$scope.triggerCount = function() {
			var count = $scope.layout.props.triggers.length;

			return count
				? (count > 1 ? "There are " + count + " triggers registered." : "There is 1 trigger registered.")
				: "There are no triggers registered.";
		};

		/**
		 * Clean up when the controller is destroyed
		 *
		 * @return {Void}
		 */
		$scope.$on("$destroy", function() {

			// Clear the controller's cache
			cache.clear();

			// Remove the registered style
			deregisterStyle();
		});
	}],

	/**
	 * Return whether the trigger's calculation condition is positive
	 *
	 * @param  {Object}  trigger Trigger data
	 * @return {Boolean}         Is the trigger active?
	 */
	isTriggerActive = function( trigger ) {
		return util.booleanFromExpression(trigger.active);
	},

	/**
	 * List of event properties to monitor for changes
	 *
	 * @type {Array}
	 */
	monitoredEventProps = ["event", "field", "value", "state", "eitherOr"],

	/**
	 * Determine which triggers should be added or removed
	 *
	 * @param  {Array}  newTriggers New list of triggers
	 * @param  {Array}  oldTriggers Old list of triggers
	 * @return {Object}             Changed triggers
	 */
	getChangedTriggers = function( newTriggers, oldTriggers ) {
		var toAdd = [], toRemove = [], prevTriggers;

		// Walk the new triggers
		newTriggers.forEach( function( i ) {

			// Find the previous version
			prevTriggers = oldTriggers.find( function( j ) {
				return j.cId === i.cId;
			});

			// Trigger is new
			if (! prevTriggers) {
				toAdd.push(i.cId); // Use ids for referencing...

			// Trigger is maybe changed
			} else {

				// Check the list of relevant trigger properties
				var isChanged = monitoredEventProps.reduce( function( is, prop ) {
					return is || i[prop] !== prevTriggers[prop];
				}, false);

				// Trigger is changed
				if (isChanged) {
					toRemove.push(i.cId);
					toAdd.push(i.cId);
				}
			}
		});

		// Walk the old triggers
		oldTriggers.forEach( function( i ) {

			// Trigger is not in the new set
			if (! newTriggers.find( function( j ) {
				return j.cId === i.cId;
			})) {
				toRemove.push(i.cId);
				return;
			}
		});

		return {
			toAdd: toAdd,
			toRemove: toRemove
		};
	};

	return {
		definition: props,
		initialProperties: initProps,
		template: tmpl,
		controller: controller,

		/**
		 * Setup listeners and watchers when the object is mounted
		 *
		 * NOTE: this hook is available since QS April 2018
		 *
		 * @return {Void}
		 */
		mounted: function() {
			var context = this;

			// Initial setup of existing event listeners
			this.$scope.setupEventListeners();

			// Act when the list of triggers is updated
			this.$scope.$watchCollection("layout.props.triggers", function( newValue, oldValue ) {
				var changedTriggers = getChangedTriggers(newValue, oldValue);

				// Bail when no changes are noticed
				if (_.isEmpty(changedTriggers.toAdd) && _.isEmpty(changedTriggers.toRemove)) {
					return;
				}

				// Tear down the existing event listeners
				context.$scope.destroyEventListeners(changedTriggers.toRemove).then( function() {

					// Setup the event listeners
					context.$scope.setupEventListeners(changedTriggers.toAdd);
				});
			});

			// Act when the object's state is updated
			this.$scope.$watch("layout.qStateName", function() {

				// Completely reset all event listeners
				context.$scope.resetEventListeners();
			});

			// Run events mounter
			emergoEvents.mount(this.$scope);

			// Run actions mounter
			emergoActions.mount(this.$scope);
		},

		/**
		 * Clean-up before the extension object is destroyed
		 *
		 * NOTE: this hook is available since QS April 2018
		 *
		 * @return {Void}
		 */
		beforeDestroy: function() {

			// Remove all event listeners
			this.$scope.destroyEventListeners();

			// Run events destroyer
			emergoEvents.destroy(this.$scope);

			// Run actions destroyer
			emergoActions.destroy(this.$scope);
		},

		support: {
			snapshot: false,
			export: false,
			exportData: false
		}
	};
});
