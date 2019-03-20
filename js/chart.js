"use strict"

/**
	* Chart builder
	* 
	* Settings:
	* container   (string)  - (mandatory) ID of DOM element where to build charts
	* chart_data  (array)   - (mandatory) JSON object with data about charts
	* namespace   (string)  - (mandatory) namespace prefix for IDs of generated DOM elements
	* externalCss (boolean) - (optional, false by default) use external css file for styling elements, or generate styles via JS
	* title 			(string) -  (optional) showing title of charts
	*/
function ChartBuilder(settings) {
	let self = this,
			$container = null,
			chart_data = null,
			namespace = 'app',
			externalCss = false,
			title = null,
			caret_min_width = null,

			$app__main = null,
			$app__main_title = null,
			$app__main_holder = null,
			$app__main_wrapper = null,
			$app__main_svg = null,
			svg_main__computed = {},
			$app__scroll = null,
			$app__scroll_svg = null,
			$scrollbar__caret = null,
			$scrollbar__caret_hand_left = null,
			$scrollbar__caret_hand_right = null,
			$scrollbar__backdrop_left = null,
			$scrollbar__backdrop_right = null,
			$app__switchers = null,
			xmlns = "http://www.w3.org/2000/svg",
			$svg = null,
			charts = [],
			all_values = [],
			max_value_abs = null,
			min_value_abs = null,	
			timestamps = [],
			visible = {
				from: 0.75, 
				to: 1
			},
			breakpoints = 5,
			px_per_day = null,
			px_per_val = null,
			step_value = null,
			min_breakpoint_value = 0,
			koef = 1;

	/**
		* Constructor of Chart
		*/
	function constructor(settings) {
		$container			= settings.container;
		chart_data			= settings.chart_data;
		namespace				= settings.namespace;
		externalCss			= settings.externalCss;
		title 					= settings.title;
		caret_min_width = settings.caret_min_width || 50;

		if( !$container || !chart_data ) {
			console.error('Chart builder constructor error! Mandatory settings wasn\'t set!', settings);
			return false;
		}

		if ( !externalCss ) {
			let css = 'h1 { background: red; }',
			    head = document.head || document.getElementsByTagName('head')[0],
			    style = document.createElement('style');

			head.appendChild(style);

			style.type = 'text/css';

			if (style.styleSheet){
			  style.styleSheet.cssText = css;
			} else {
			  style.appendChild(document.createTextNode(css));
			}			
		}

		// console.log(chart_data);

		createLayouts();
		prepareData();
		calcVariables();
		drawValuesLines();
		drawBreakpoints();
		drawDates();
		drawCharts();
		drawScrollCharts();
		drawScrollbar();
		drawChartsSwitchers();
		createEvents();

		// console.log(charts);
		// console.log(timestamps);
	}

	this.createElementNS = function(ns, name, attributes, styles) {
		let $el = null;

		if( ns !== null ) {
			$el = document.createElementNS(ns, name);			
		} else {
			$el = document.createElement(name);			
		}

		for( let prop in attributes ) {
			$el.setAttribute(prop, attributes[prop]);
		}
		
		if( styles ) {
			self.css($el, styles);			
		}

		return $el;
	}

	this.css = function($el, styles) {
		if( typeof $el !== "object" || !($el instanceof Element) ) {
			console.warn($el, 'should be instance of Element!');
			 return false;
		}

		if( !(styles instanceof Object) || typeof styles !== "object" ) {
			console.warn('Styles should be object', styles);
			return false;
		}

		let cssText = '';

		for( let prop in styles ) {
			if( styles[prop] !== null ) {
				cssText += prop + ":" + styles[prop] + ";";				
			}
		}

		$el.style.cssText += cssText;
	}

	/**
		* Create SVG and base elements
		*/
	function createLayouts() {
		$app__main = self.createElementNS(null, 'div', {
									id: namespace + '__main'
								});
		$app__scroll = self.createElementNS(null, 'div', {
									id: namespace + '__scroll'
								});
		$app__switchers = self.createElementNS(null, 'div', {
									id: namespace + '__switchers'
								});
		if( title ) {
			$app__main_title = self.createElementNS(null, 'div', {
										id: namespace + '__main-title'
									});			
			$app__main_title.innerHTML = title;
		}
		$app__main_holder = self.createElementNS(null, 'div', {
									id: namespace + '__main-holder'
								});
		$app__main_wrapper = self.createElementNS(null, 'div', {
									id: namespace + '__main-wrapper'
								});
		$app__main_svg = self.createElementNS(xmlns, 'svg', {
								width: (1 / (visible.to - visible.from)) * 100 +'%',
								height: '100%',
								id: namespace + '__main-svg'
							});
		$app__scroll_svg = self.createElementNS(xmlns, 'svg', {
									width: '100%',
									height: '100%',
									id: namespace + '__scroll-svg'
								});
		$container.innerHTML = "";
		$container.appendChild($app__main);
		$container.appendChild($app__scroll);
		$container.appendChild($app__switchers);

		if( title ) {
			$app__main.appendChild($app__main_title);
		}

		$app__main.appendChild($app__main_holder);
		$app__main_holder.appendChild($app__main_wrapper);

		$app__main_wrapper.appendChild($app__main_svg);
		$app__scroll.appendChild($app__scroll_svg);
	}

	function prepareData() {
		let data = chart_data,
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
		let main_holder_params = $app__main_holder.getBoundingClientRect();

		svg_main__computed = getComputedStyle($app__main_svg);
		px_per_day = parseInt(svg_main__computed.width) / timestamps.length;

		charts.forEach(function(chart) {
			all_values = all_values.concat(chart.column);
		});

		let svg_main_height = parseInt(svg_main__computed.height);
		
		max_value_abs = Math.max.apply(null, all_values);
		min_value_abs = Math.min.apply(null, all_values);	
				
		step_value = Math.ceil(max_value_abs / breakpoints);

		let section = null,
				i = 0;

		while ( section !== 0 && i < 5 ) {
			for ( let b = 0; b <= breakpoints; b++ ) {
				if ( min_value_abs < step_value * b + min_breakpoint_value ) {
					min_breakpoint_value = (b - 1) * step_value + min_breakpoint_value;
					section = b - 1;
					break;
				}
			}
			i++;
			step_value = Math.ceil((max_value_abs - min_breakpoint_value) / breakpoints);
		} 

		koef = (svg_main_height - 70)/(max_value_abs - min_breakpoint_value);
		px_per_val = svg_main_height / ((max_value_abs - min_breakpoint_value) * koef);
	}

	function drawValuesLines() {
		let $group_lines = self.createElementNS(xmlns, 'g'),
				margin_bottom = 50,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		for ( let b = 0; b <= breakpoints; b++ ) {
			let y = start_height - (b * step_value * koef),
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

		$app__main_svg.appendChild($group_lines);
	}

	function drawBreakpoints() {
		let main_holder_params = $app__main_holder.getBoundingClientRect(),
				$svg_breakpoints = self.createElementNS(xmlns, 'svg', {
														id: namespace + '__breakpoints',
														width: '60px',
														height: main_holder_params.height + 'px'
													}),
				$group_breakpoints = self.createElementNS(xmlns, 'g'),
				margin_bottom = 50,
				line_height = 5,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		for ( let b = 0; b <= breakpoints; b++ ) {
			let y = start_height - line_height - (b * step_value * koef),
					$text = self.createElementNS(xmlns, 'text', {
										x: 0,
										y: y,
										fill: '#aaa'
									},
									{
										'font-size': '14px'
									});
			$text.append(b * step_value + min_breakpoint_value);
			$group_breakpoints.appendChild($text);
			$svg_breakpoints.appendChild($group_breakpoints);
		}

		$app__main_holder.appendChild($svg_breakpoints);
	}

	function drawDates() {
		let $app__main_svg = document.getElementById(namespace + '__main-svg'),
				date_diff = timestamps[timestamps.length - 1] - timestamps[0],
				date_diff_in_days = date_diff/(1000*60*60*24),
				draw_period = 7,
				periods = Math.ceil(date_diff_in_days / draw_period),
				$group_values = self.createElementNS(xmlns, 'g'),
				margin_bottom = 20,
				margin_right = 40,
				min_width = 55,
				y = parseInt(svg_main__computed.height) - margin_bottom,
				monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

		periods = Math.floor((parseInt(svg_main__computed.width) - margin_right) / (min_width + margin_right));
		draw_period = date_diff_in_days / periods;

		let index = 0;
		for ( let t = timestamps[0]; t <= timestamps[timestamps.length - 1]; t += draw_period*1000*60*60*24) {
			let $text = self.createElementNS(xmlns, 'text', {
									x: index * (min_width + margin_right),
									y: y,
									fill: '#aaa'
								},
								{
									'font-size': '14px'
								}),
					date = new Date(t),
					month = date.getMonth(),
					day = date.getDate();

			$text.append(monthNames[month] + ' ' + day);
			$group_values.appendChild($text);
			index++;
		}


		if( $app__main_svg.getBoundingClientRect().width < ((index + 1) * min_width) ) {
			$app__main_svg.setAttribute('width', timestamps.length * min_width + 'px');
		}

		$app__main_svg.appendChild($group_values);
	}

	function drawCharts() {
		// console.log(charts);
		let $group_charts = self.createElementNS(xmlns, 'g'),
				margin_bottom = 50,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		charts.forEach(function(chart) {
			let points_string = '',
					start_ts = timestamps[0];
			chart.column.forEach(function(y, i) {
				let date_diff = timestamps[i] - start_ts,
						days_diff = 0;
				if ( date_diff > 0 ) {
					days_diff = date_diff/(1000*60*60*24);
				}
				points_string += (days_diff * px_per_day) + ',' + (start_height - (y - min_breakpoint_value) * koef) + ' ';
			});

			points_string.trim();

			let $chart_line = self.createElementNS(xmlns, 'polyline', {
													points: points_string
												},
												{
													fill: 'transparent', 
													stroke: chart.color,
													'stroke-width': 2
												});

			$group_charts.appendChild($chart_line);
		});

		$app__main_svg.appendChild($group_charts);	
	}

	function drawScrollCharts() {
		// console.log(charts);
		let $app__scroll_svg = document.getElementById(namespace + '__scroll-svg'),
				$group_charts = self.createElementNS(xmlns, 'g'),
				app__scroll_svg_params = $app__scroll_svg.getBoundingClientRect(),
				start_height = app__scroll_svg_params.height,
				px_scroll_per_day = app__scroll_svg_params.width / timestamps.length,
				koef_scroll = start_height/max_value_abs;

		charts.forEach(function(chart) {
			let points_string = '',
					start_ts = timestamps[0];
			chart.column.forEach(function(y, i) {
				let date_diff = timestamps[i] - start_ts,
						days_diff = 0;
				if ( date_diff > 0 ) {
					days_diff = date_diff/(1000*60*60*24);
				}
				points_string += (days_diff * px_scroll_per_day) + ',' + (start_height - (y * koef_scroll)) + ' ';
			});

			points_string.trim();

			let $chart_line = self.createElementNS(xmlns, 'polyline', {
													points: points_string
												},
												{
													fill: 'transparent', 
													stroke: chart.color,
													'stroke-width': 1
												});

			$group_charts.appendChild($chart_line);
		});

		$app__scroll_svg.appendChild($group_charts);
	}

	function drawScrollbar() {
		$scrollbar__caret = self.createElementNS(null, 'div', {
															id: namespace + '__scrollbar-caret'
														}),
		$scrollbar__caret_hand_left = self.createElementNS(null, 'div', {
															class: namespace + '__caret-hand ' + namespace + '__caret-hand_left'
														}),
		$scrollbar__caret_hand_right = self.createElementNS(null, 'div', {
															class: namespace + '__caret-hand ' + namespace + '__caret-hand_right'
														}),
		$scrollbar__backdrop_left = self.createElementNS(null, 'div', {
															class: namespace + '__scrollbar-backdrop ' + namespace + '__scrollbar-backdrop_left'
														},
														{
															left: 0
														}),
		$scrollbar__backdrop_right = self.createElementNS(null, 'div', {
															class: namespace + '__scrollbar-backdrop ' + namespace + '__scrollbar-backdrop_right'
														},
														{
															right: 0
														});

		let app__scroll_width = $app__scroll.offsetWidth;
		setScrollbar(app__scroll_width * 0.75, app__scroll_width * 0.25);
		$app__scroll.appendChild($scrollbar__backdrop_left);
		$app__scroll.appendChild($scrollbar__backdrop_right);
		$app__scroll.appendChild($scrollbar__caret);
		$scrollbar__caret.appendChild($scrollbar__caret_hand_left);
		$scrollbar__caret.appendChild($scrollbar__caret_hand_right);
	}

	function drawChartsSwitchers() {
		let $app__switchers = document.getElementById(namespace + '__switchers');

		charts.forEach(function(chart) {
			// console.log(chart);
			let $chart_switcher = self.createElementNS(null, 'div', {
													class: namespace + '-switcher checked'
												}),
					$chart_switcher__chbox = self.createElementNS(null, 'span', {
													class: namespace + '-switcher__chbox'
												},
												{
													'background-color': chart.color,
													'border': '2px solid ' + chart.color,
												}),
					$checkmark = self.createElementNS(xmlns, 'svg', {
													class: 'checkmark'
												}),
					$checkmark_line = self.createElementNS(xmlns, 'polyline', {
															points: '4,8 7,11 12,5'
														},
														{
															fill: 'transparent',
															stroke: 'white',
															'stroke-width': 1.5,
															'stroke-linecap': 'square'
														}),
					$chart_switcher__name = self.createElementNS(null, 'span', {
													class: namespace + '-switcher__name'
												});

			$chart_switcher__name.innerHTML = chart.name;

			$checkmark.appendChild($checkmark_line);
			$chart_switcher__chbox.appendChild($checkmark);
			$chart_switcher.appendChild($chart_switcher__chbox);
			$chart_switcher.appendChild($chart_switcher__name);
			$app__switchers.appendChild($chart_switcher);
		});
	}

	function createEvents() {
		// Switch visibility of charts
		let $chart_switchers = document.querySelectorAll('.app-switcher');
		$chart_switchers.forEach(function($switcher) {
			$switcher.addEventListener('click', function(e) {
				let $checked = document.querySelectorAll('.app-switcher.checked');
				
				if( $switcher.classList.contains('checked') ) {
					if( $checked.length > 1 ) {
						$switcher.classList.remove('checked');
						onChartSelectChange(document.querySelectorAll('.app-switcher.checked'));
					}
				} else {
					$switcher.classList.add('checked');
					onChartSelectChange(document.querySelectorAll('.app-switcher.checked'));
				}

				$checked = document.querySelectorAll('.app-switcher.checked');
				if( $checked.length === 1 ) {
					$checked[0].classList.add('disabled');
				} else {
					$checked.forEach(function($switcher) {
						$switcher.classList.remove('disabled');
					});
				}
			});
		});	

		// Scrollbar caret move
		let move__start = null,
				move__finish = null,
				move__diff = null,
				scrollbar__caret_left = null,
				scrollbar__caret_width = null,
				action = null;

		document.addEventListener('mousedown', function(e) {
			if( e.which === 1 && e.target === $scrollbar__caret) {
				action = 'move';
			} else if( e.which === 1 && e.target === $scrollbar__caret_hand_left) {
				action = 'resize_left';
			} else if( e.which === 1 && e.target === $scrollbar__caret_hand_right) {
				action = 'resize_right';
			}
		});
		
		document.addEventListener('mouseup', function(e) {
			action = null;
			move__start = null;
		});

		document.addEventListener('mousemove', function(e) {
			if( action === 'move' ) {
				if( move__start === null ) {
					scrollbar__caret_left = parseInt($scrollbar__caret.style.left);
					scrollbar__caret_width = parseInt($scrollbar__caret.style.width);
					move__start = e.x;
				} else {
					move__finish = e.x;
					move__diff = move__finish - move__start;

					let new_left = scrollbar__caret_left + move__diff;

					if( new_left < 0 ) {
						new_left = 0;
					}

					if( new_left + scrollbar__caret_width >= $app__scroll.offsetWidth ) {
						new_left = $app__scroll.offsetWidth - scrollbar__caret_width;
					}

					setScrollbar(new_left, scrollbar__caret_width);
				}

			} else if( action === 'resize_left' ) {
				// console.log(action);
				if( move__start === null ) {
					scrollbar__caret_left = parseInt($scrollbar__caret.style.left);
					scrollbar__caret_width = parseInt($scrollbar__caret.style.width);
					move__start = e.x;
				} else {
					move__finish = e.x;
					move__diff = move__finish - move__start;
					let new_left = scrollbar__caret_left + move__diff,
							new_width = scrollbar__caret_width - move__diff;

					if( new_left < 0 ) {
						new_left = 0;
						new_width = null;
					}

					if( new_width && new_width <= caret_min_width ) {
						new_left = parseInt($scrollbar__caret.style.left);
						new_width = caret_min_width;
					}

					setScrollbar(new_left, new_width);
				}

			} else if( action === 'resize_right' ) {
				// console.log(action);
				if( move__start === null ) {
					scrollbar__caret_left = parseInt($scrollbar__caret.style.left);
					scrollbar__caret_width = parseInt($scrollbar__caret.style.width);
					move__start = e.x;
				} else {
					move__finish = e.x;
					move__diff = move__finish - move__start;
					let new_width = scrollbar__caret_width + move__diff;

					if( scrollbar__caret_left + new_width > $app__scroll.offsetWidth ) {
						new_width = $app__scroll.offsetWidth - scrollbar__caret_left;
					}

					if( new_width && new_width <= caret_min_width ) {
						new_width = caret_min_width;
					}

					setScrollbar(scrollbar__caret_left, new_width);
				}
			}
		}, true);

	}

	function onChartSelectChange($checked) {	
		console.log($checked);
	}

	function setScrollbar(left, width) {
		if( width === null ) {
			return false;
		}

		self.css($scrollbar__caret, {
			left: left + 'px',
			width: width + 'px'
		});

		self.css($scrollbar__backdrop_left, {
			width: left + 'px'
		});

		self.css($scrollbar__backdrop_right, {
			width: $app__scroll.offsetWidth - width - left + 'px'
		});

		scrollMainSVG(left/$app__scroll.offsetWidth);
	}

	function scrollMainSVG(left) {
		self.css($app__main_svg, {
			transform: 'translateX(' + (- left * 100) + '%);'
		});
	}

	constructor(settings);
}