/**
 * E-mergo Triggers Initial Properties
 *
 * @package E-mergo Tools Bundle
 *
 * @param  {String} qext          Extension QEXT data
 * @return {Object}               Initial properties
 */
define([
	"text!./qs-emergo-triggers.qext"
], function( qext ) {
	return {
		props: {
			triggers: [{
				label: "Trigger 1",
				enabled: true,
				event: {
					event: ""
				},
				actions: [],
				navigation: {}
			}]
		},
		showTitles: false,
		title: JSON.parse(qext).name
	};
});
