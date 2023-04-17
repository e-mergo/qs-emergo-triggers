/**
 * E-mergo Triggers Property Panel definition
 *
 * @param  {Object} _             Underscore library
 * @param  {Object} util          E-mergo utility functions
 * @param  {Object} emergoEvents  E-mergo Events API
 * @param  {Object} emergoActions E-mergo Actions API
 * @param  {Object} docs          E-mergo documentation functions
 * @param  {String} qext          Extension QEXT data
 * @return {Object}               Extension Property Panel definition
 */
define([
	"underscore",
	"./util/util",
	"./util/qs-emergo-events",
	"./util/qs-emergo-actions",
	"./docs/docs",
	"text!./qs-emergo-triggers.qext"
], function( _, util, emergoEvents, emergoActions, docs, qext ) {

	/**
	 * Holds the QEXT data
	 *
	 * @type {Object}
	 */
	var qext = JSON.parse(qext),

	/**
	 * Define a subset of the events definition
	 *
	 * @type {Object}
	 */
	eventsDefinition = (function(){
		var def = {}, i;

		for (i in emergoEvents.eventsDefinition) {
			if (emergoEvents.eventsDefinition.hasOwnProperty(i) && "enabled" !== i) {
				def[i] = emergoEvents.eventsDefinition[i];
			}
		}

		return def;
	})(),

	/**
	 * Holds the settings definition of the triggers sub-panel
	 * 
	 * @type {Object}
	 */
	triggers = {
		label: "Triggers",
		addTranslation: "Add Trigger",
		type: "array",
		ref: "props.triggers",
		itemTitleRef: function( trigger, none, context ) {
			var a = _.findWhere(context.layout.props.triggers, { cId: trigger.cId }),
			    label = a && a.label || trigger.label;

			// Signal disabled triggers
			if (! trigger.enabled) {
				label = "// ".concat(label);
			}

			return label;
		},
		allowAdd: true,
		allowRemove: true,
		allowMove: true,
		items: {
			label: {
				translation: "Common.Label",
				type: "string",
				expression: "optional",
				ref: "label"
			},
			calcCond: {
				label: "Run trigger if",
				type: "string",
				expression: "optional",
				ref: "active"
			},
			event: {
				label: "Event listener",
				type: "items",
				items: eventsDefinition
			},
			actions: {
				label: "Actions",
				addTranslation: "Add Action",
				type: "array",
				ref: "actions",
				itemTitleRef: emergoActions.actionItemTitleRef,
				allowAdd: true,
				allowRemove: true,
				allowMove: true,
				items: emergoActions.actionsDefinition,

				/**
				 * Modify the action's properties when it is added
				 *
				 * @param {Object} item Action properties
				 * @return {Void}
				 */
				add: function( item ) {
					// Needed? JSON parse error when omitted.
					item.qHyperCubeDef = {
						qDimensions: [{
							qDef: {}
						}],
						qMeasures: [{
							qDef: {}
						}]
					};
				}
			},
			navigation: {
				type: "items",
				ref: "navigation",
				items: emergoActions.navigationDefinition
			},
			enabled: {
				translation: "Common.Enabled",
				ref: "enabled",
				type: "boolean",
				component: "switch",
				defaultValue: true,
				options: [{
					translation: "properties.on",
					value: true,
				}, {
					translation: "properties.off",
					value: false
				}]
			}
		},

		/**
		 * Modify the trigger's properties when it is added
		 *
		 * @param {Object} item   Button properties
		 * @param {Object} layout Extension settings layout
		 */
		add: function( item, layout ) {
			item.label = "Trigger ".concat(layout.props.triggers.length + 1);
		}
	},

	appearance = {
		uses: "settings",
		items: {
			general: {
				show: false
			}
		}
	},

	/**
	 * Holds the settings definition of the about sub-panel
	 *
	 * @type {Object}
	 */
	about = {
		label: function() {
			return "About ".concat(qext.title);
		},
		type: "items",
		items: {
			author: {
				label: "This Qlik Sense extension is developed by E-mergo.",
				component: "text"
			},
			version: {
				label: function() {
					return "Version: ".concat(qext.version);
				},
				component: "text"
			},
			description: {
				label: "Please refer to the accompanying documentation page for a detailed description of this extension and its features.",
				component: "text"
			},
			help: {
				label: "Open documentation",
				component: "button",
				action: function( props ) {
					util.requireMarkdownMimetype().finally( function() {
						var readmeFile = window.requirejs.toUrl("extensions/".concat(props.qInfo.qType, "/README.md"));

						require(["text!".concat(readmeFile)], function( readme ) {
							docs.showModal(readme, qext);
						});
					});
				}
			}
		}
	};

	return {
		type: "items",
		component: "accordion",
		items: {
			triggers: {
				label: "Triggers",
				type: "items",
				items: {
					description: {
						label: "Triggers may run simultaneously. Actions of a trigger may fire events that release other triggers. When setting up triggers be aware that you do not create infinite action loops.",
						component: "text",
						style: "hint"
					},
					note: {
						label: "Note that trigger actions might affect the selection history. Also, navigating the selection history might (re-)trigger actions.",
						component: "text",
						style: "hint"
					},
					triggers: triggers
				}
			},
			appearance: appearance,
			about: about
		}
	};
});
