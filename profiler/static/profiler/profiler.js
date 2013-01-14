$(function(){
  $('.query-collapse').each(
      function()
      {
	  var $t = $(this);
	  var text = $t.html();
          var spl = text.split(/((?:SELECT|INSERT|FROM|INTO|WHERE|JOIN))/);
          var result = '';
	  $t.html('');
	  var expand = function(){
	    $t.html(text);
	  };
	  for (var i=0,l=spl.length; i<l;i++){
	      $t.append(spl[i].substring(0,20));
	      if (spl[i].length > 20)
		  $t.append($('<a class="ellipsis" href="javascript:;">...</a>').click(expand));
	  }
      });
  $('.sortable').tablesorter();
  }
);


var w = 1200,
    h = 800,
    i = 0,
    barWidth = w,
    statsOffset=barWidth - 100*3,
    duration = 400,
    lineHeight = 30,
    root,
    metrics  = function(){return [];};

var tree = d3.layout.tree()
    .size([h, 100]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", w)
    .attr("height", h)
  .append("svg:g")
    .attr("transform", "translate(20,30)");


function update(source) {

  // Compute the flattened node list. TODO use d3.layout.hierarchy.
  var nodes = tree.nodes(root);


  // Update the nodes…
  var node = vis.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });




  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .style("opacity", 1e-6);

    var dh=0;
  // Compute the "layout".
  nodes.forEach(function(n,i) {
	      n.x = dh;
	      dh+=wrapText(n.name).length*lineHeight;
	    });
  d3.select('#chart svg').transition().attr('height', dh + lineHeight);


  // Enter any new nodes at the parent's previous position.
  nodeEnter.append("svg:rect")
      .attr("y", 0)
      .attr("height", function(d){return wrapText(d.name).length*lineHeight; })
      .attr("width", function(d){return barWidth-d.y;})
      .style("fill",color)
      .on("click", click);
    
    
  nodeEnter.append("svg:text")
	.attr("dy", 3.5)
	.attr("dx", 5.5)
	.each(function(d){
		  d3.select(this)
		      .selectAll('tspan')
		      .data(wrapText(d.name))
		      .enter()
		      .append('svg:tspan')
		      .attr('x',0)
		      .attr('dy', 20)
		      .text(function(dd){return dd;});
		  
	      });

    for (var q=0,l=metrics(root).length;q<l;q++){
	nodeEnter.append("svg:text")
	    .attr('x', function(d){ return statsOffset-d.y + 100*q;})
	    .attr('y', 20)
	    .attr('width', 100)
	    .text(function(dd){return metrics(dd)[q];});
    }

    



  // Transition nodes to their new position.
  nodeEnter.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
      .style("opacity", 1);

  node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
      .style("opacity", 1)
    .select("rect")
      .style("fill", color);

  // Transition exiting nodes to the parent's new position.
  node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .style("opacity", 1e-6)
      .remove();

  // Update the links…
  var link = vis.selectAll("path.link")
      .data(tree.links(nodes), function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("svg:path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      })
    .transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}

function color(d) {
    if (typeof(d.normtime)!='undefined')
	return d3.hsl((1-d.normtime)*120, 0.9, 0.7);
  return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
}

function wrapText(text){
    var line='',lines = [],
    words = text.split(' ');
    for (var i = 0, l=words.length; i<l; i++){
	line +=' '+words[i];
	if (line.length>80) {
	    lines.push(line);
	    line='';
	}
    }
    lines.push(line);
    return lines;
}

function addToTree(tree, path, reduce){
    var subtree = tree;
    for (var i=0, l=path.length; i<l; i++){
	var found=false;
	for (var j=0, jl=subtree.children.length; j<jl; j++){
	    if (subtree.children[j].name == path[i]){
		subtree = subtree.children[j];
		found=true;
		break;
	    }
	}
	if (!found){
	    subtree = subtree.children[subtree.children.length] = {name:path[i], children:[]};
	}			    	
	reduce(subtree);
    }   
}

function toTree(data, getPath, reduce){
    var tree = {'name' : '/', 'children' : []};
    for (var i=0, l=data.length; i<l; i++){
	addToTree(tree, getPath(data[i]), 
		  function(node){
		      reduce(node, data[i]);
		  });
    }
    return tree;
}