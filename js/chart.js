"use strict"

/**
	* Chart builder
	*/
function ChartBuilder(settings) {
	let self = this,
			chart_data = null,
			$container = null,
			$main = null,
			$main_holder = null,
			$svg_main = null,
			svg_main__computed = {},
			$scroll = null,
			$svg_scroll = null,
			$switchers = null,
			xmlns = "http://www.w3.org/2000/svg",
			$svg = null,
			charts = [],
			timestamps = [],
			visible = {
				from: 0.75, 
				to: 1
			},
			breakpoints = 5,
			px_per_day = null,
			px_per_val = null,
			step_value = null;

	/**
		* Constructor of Chart
		*/
	function constructor(settings) {
		console.log('Creating Chart...');
		$container = settings.container;
		chart_data = settings.chart_data;
		if( !$container || !chart_data ) {
			console.error('Chart builder constructor error! Settings not valid!');
			return false;
		}

		$main = $container.children[0];
		$scroll = $container.children[1];
		$switchers = $container.children[2];

		$main_holder = $main.children[1];

		// console.log(chart_data);

		createLayouts();
		prepareData();
		calcVariables();
		drawValuesLines();
		drawBreakpoints();

		// console.log(charts);
		// console.log(timestamps);
	}

	this.createElementNS = function(ns, name, attributes, styles) {
		let $el = document.createElementNS(xmlns, name);

		for( let prop in attributes ) {
			$el.setAttribute(prop, attributes[prop]);
		}
		
		if( styles && styles instanceof Object && typeof styles === "object" ) {
			let cssText = '';
			for( let prop in styles ) {
				cssText += prop + ":" + styles[prop] + ";";
			}
			$el.style.cssText = cssText;
		}

		return $el;
	}


	/**
		* Create SVG and base elements
		*/
	function createLayouts() {
		$svg_main = self.createElementNS(xmlns, 'svg', {
								width: (1 / (visible.to - visible.from)) * 100 +'%',
								height: '100%'
							},
							{
								background: '#fff'
							});
		$svg_scroll = self.createElementNS(xmlns, 'svg', {
									width: '100%',
									height: '100%'
								},
								{
									background: 'linear-gradient(to right, yellow, black)'
								});
		$main_holder.appendChild($svg_main);
		$scroll.appendChild($svg_scroll);
	}

	function prepareData() {
		let data = chart_data[0],
				dates_col_name = data.types.x;

		// Prepare data for charts
		for( let prop in data.names ) {
			let chart = {};
			chart.name = data.names[prop];
			chart.type = data.types[prop];
			chart.color = data.colors[prop];
			chart.column = data.columns.filter(function(column) {
				if ( column[0] === prop ) {
					column.shift();
					return column;
				}
			})[0];
			charts.push(chart);
		}

		// Get timestamps
		timestamps = data.columns.filter(function(column) {
			if ( column[0] === dates_col_name ) {
				column.shift();
				return column;
			}
		})[0];

		// Sort timestamps
		timestamps.sort(function(a,b) {
			if( a < b ) {
				return -1;
			} else if ( a > b ) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	function calcVariables() {
		svg_main__computed = getComputedStyle($svg_main);
		px_per_day = parseInt(svg_main__computed.width) / timestamps.length;

		let all_values = [];
		charts.forEach(function(chart) {
			all_values = all_values.concat(chart.column);
		});

		let max_value = Math.max.apply(null, all_values);
		px_per_val = parseInt(svg_main__computed.height) / max_value;
		step_value = Math.floor(max_value / breakpoints);
	}

	function drawValuesLines() {
		let $group_lines = self.createElementNS(xmlns, 'g', {
									width: '100%',
									height: '100%'
								},
								{
									background: '#fff'
								}),
				margin_bottom = 50,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		for ( let b = 0; b <= breakpoints; b++ ) {
			let y = start_height - (b * step_value),
					$line = self.createElementNS(xmlns, 'line', {
									x1: 0,
									y1: y,
									x2: '100%',
									y2: y,
									stroke: '#ccc',
									'stroke-width': 0.5
								});
			$group_lines.appendChild($line);
		}

		$svg_main.appendChild($group_lines);
	}

	function drawBreakpoints() {
		let $group_breakpoints = self.createElementNS(xmlns, 'g', {
									width: '10%',
									height: '100%'
								}),
				margin_bottom = 50,
				line_height = 5,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		for ( let b = 0; b <= breakpoints; b++ ) {
			let y = start_height - line_height - (b * step_value),
					$text = self.createElementNS(xmlns, 'text', {
									x: 0,
									y: y,
									fill: '#aaa'
								},
								{
									'font-size': '14px'
								});
			$text.append(b * step_value);
			$group_breakpoints.appendChild($text);
		}

		$svg_main.appendChild($group_breakpoints);
	}

	constructor(settings);
}