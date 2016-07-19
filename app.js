window.onload = function init() {
	'use strict';

	var width = 800,
		height = 800,
		svg = d3.select('svg#main-plot').attr('width', width).attr('height', height),
		circles = svg.append('g').attr('transform', 'translate(' + width / 2 + ', ' + height / 2 + ')'),
		titles = svg.append('g').attr('transform', 'translate(' + width / 2 + ', ' + height / 2 + ')'),
		text, simulation;

	function readSingleFile(evt) {
		var f = evt.target.files[0];
		if (f) {
			var r = new FileReader();
			r.onload = function(e) {
				text = e.target.result;
				processText();
			}
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}

	d3.text('pride-and-prejudice.txt', function(data) {
		text = data;
		processText();
	});
	document.getElementById('words-limit').addEventListener('change', processText, false);
	document.getElementById('related-words-limit').addEventListener('change', processText, false);
	document.getElementById('scale').addEventListener('change', processText, false);
	document.getElementById('custom-file').addEventListener('change', readSingleFile, false);

	function processText() {
		if (simulation) simulation.stop();

		var wordLimit = +d3.select('input#words-limit').property('value'), 
			relatedWordsLimit = +d3.select('input#related-words-limit').property('value'), 
			scale = +d3.select('input#scale').property('value'),
			words = parseText(text),
			wordFrequencies = getWordFrequencies(words),
			mostFrequentWords = getMostFrequentWords(wordFrequencies, wordLimit),
			nodes = Object.keys(mostFrequentWords).map(function(d) {
				return {
					'word': d, 
					'r': scale * Math.log(mostFrequentWords[d])
				};
			}),
			edges = getEdges(words, mostFrequentWords);

		simulation = d3.forceSimulation(nodes)
			.force('x', d3.forceX().strength(0.002))
			.force('y', d3.forceY().strength(0.002))
			.force('collide', d3.forceCollide().radius(function(d) { return d.r + 0.5; }).iterations(2))
			.force('link', d3.forceLink(getLinks(edges)).id(function(d) {return d.word;}).strength(function(d){ return d.strength; }))
			.on('tick', draw);

		function parseText(text) {
			return text.split(/[^a-zA-Z0-9]+/).map(function(word) {return word.toLowerCase();});
		}

		function getWordFrequencies(words) {
			var result = {};
			for (var i = 0; i < words.length; i++) {
				var word = words[i];
				result[word] = 1 + (result[word] | 0);
			}
			return result;
		}

		function getMostFrequentWords(frequncies, limit) {
			return Object.keys(frequncies).map(function(d) {
				return {
					'word': d, 
					'count': frequncies[d]
				};
			}).sort(function(a, b) {return a.count - b.count;}).slice(-limit).reduce(function(acc, d) {
				acc[d.word] = d.count;
				return acc;
			}, {});
		}

		function getEdges(words, wordFrequencies) {
			var result = {};
			for (var i = 1; i < words.length; i++) {
				if (wordFrequencies[words[i - 1]] > 0 && wordFrequencies[words[i]] > 0) {
					addConnection(words[i - 1], words[i]);
				}
			}
			for (var word in result) {
				result[word] = getMostFrequentWords(result[word], relatedWordsLimit);
			}
			return result;

			function addConnection(word1, word2) {
				if (!result.hasOwnProperty(word1)) {
					result[word1] = {};
				}
				result[word1][word2] = 1 + (result[word1][word2] | 0);
			}
		}

		function getLinks(edges) {
			var result = [];
			for (var word1 in edges) {
				for (var word2 in edges[word1]) {
					result.push({
						source: word1,
						target: word2,
						strength: edges[word1][word2] / 1000,
					});
				}
			}
			return result;
		}

		function draw() {
			var c = circles.selectAll('circle').data(nodes);
			c.enter() 
				.append('svg:circle')
				.attr('cx', function(d) {return d.x;})
				.attr('cy', function(d) {return d.y;})
				.attr('r', function(d) {return d.r;})
				.attr('class', 'plain');
			c.attr('cx', function(d) {return d.x;})
				.attr('cy', function(d) {return d.y;})
				.attr('r', function(d) {return d.r;});
			c.exit().remove();

			var t = titles.selectAll('text').data(nodes);
			t.enter()
				.append('svg:text')
				.attr('x', function(d) {return d.x;})
				.attr('y', function(d) {return d.y;})
				.text(function(d) {return d.word;})
				.attr('class', 'plain');
			t.attr('x', function(d) {return d.x;})
				.attr('y', function(d) {return d.y;})
				.text(function(d) {return d.word;});
			t.exit().remove();
		}

		svg.on('mousemove', mousemove);
		
		function mousemove() {
			var coords = d3.mouse(this);
			var target = simulation.find(coords[0] - width / 2, coords[1] - height / 2, 40);
			var word = target ? target.word : undefined;

			circles.selectAll('circle').data(nodes).attr('class', getClass);
			titles.selectAll('text').data(nodes).attr('class', getClass);

			//TODO improve color scaling and performance
			function getClass(d) {
				if (word === d.word) return 'selected';
				if (word && edges[word] && edges[word].hasOwnProperty(d.word)) return 'related' + Math.min(8, Math.round(Math.sqrt(edges[word][d.word])));
				return 'plain';
			}
		}
	}
};