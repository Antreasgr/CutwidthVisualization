function treeLayout(graph, element) {
    this.root = [];
    this.length = 0;
    this.graph = graph;

    this.svgElement = element.append("svg");
    this.gElement = this.svgElement.append("g").attr("transform", "translate(0, 50)");;

    this.diagonal = d3.svg.diagonal().projection(function(d) { return [d.x, d.y]; });

    var self = this;
    this.graph.addLayout(this);

    this.createTree = function() {
        var w = this.svgElement.node().getBoundingClientRect().width;
        var h = this.svgElement.node().getBoundingClientRect().height;
        this.tree = d3.layout.tree().size([w, h]);

        if (this.graph.nodes.length > 0) {
            var dataMap = this.graph.nodes.reduce(function(map, node) {
                map[node.name] = node;
                return map;
            }, {});

            var nextIndex = 1;
            var t = this;
            this.graph.nodes.forEach(function(d, i) {
                // add to parent
                var parent = dataMap[d.parent];
                if (parent) {
                    // create child array if it doesn't exist
                    if (parent.children == null) {
                        parent.group1 = nextIndex;
                        nextIndex++;
                    }

                    (parent.children || (parent.children = []))
                    // add node to child array
                    .push(d);

                    d.group1 = parent.group1;
                } else {
                    // parent is null or missing
                    d.group1 = 0;
                    t.root.push(d);
                }
            });

            this.length = graph.nodes.length;
        }

        this.update();
    }

    this.resize = function() {
        var w = this.svgElement.node().getBoundingClientRect().width;
        var h = this.svgElement.node().getBoundingClientRect().height;
        this.tree = d3.layout.tree().size([w, h]);

        this.update(this.root);
    }

    this.update = function(r) {
        // console.log("Update tree");
        if (!r) {
            r = this.root;
        }

        var root = r;
        if (Array.isArray(r)) {
            root = r[0];
        }

        this.tree.sort(function comparator(a, b) {
            return a.order - b.order;
        });

        var n = this.tree.nodes(root).reverse(),
            links = this.tree.links(n);

        // Normalize for fixed-depth.
        n.forEach(function(d) {
            d.y = d.depth * 60;
        });

        // Declare the nodes
        var node = this.gElement
            .selectAll(".treenode")
            .data(n, function(d) { return d.name; });

        node.exit().remove();

        node.transition()
            .duration(500)
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        node.selectAll("text")
            .text(function(d) { return d.size; })

        //update styles
        node.select("circle")
            .style("fill", function(d) { return (d.fill ? "url(#" + d.fill + ")" : "#fff"); });

        // Enter the nodes.
        var nodeEnter = node.enter().append("g")
            .attr("class", "treenode")
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", function(d, i) {
                self.graph.updateSelection(d);
                $(".plusminus").removeClass("disabled");
                //updateDebug(d);
            })
            .on("mouseout", function(d, i) {
                self.graph.updateSelection(d);
                $(".plusminus").addClass("disabled");
                //updateDebug(null);
            });

        nodeEnter.append("circle")
            .attr("r", 10)
            .style("fill", function(d) { return "white"; })
            .on("click", this.graph.treeclick.bind(this.graph));

        nodeEnter.append("text")
            .attr("y", function(d) {
                return -18;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.size; })
            .style("fill-opacity", 1);

        // Declare the links
        var link = this.gElement.selectAll("path.treelink")
            .data(this.graph.links, function(d) { return d.source.name + "_" + d.target.name; });

        link.transition().duration(500).attr("d", this.diagonal);

        link.enter().insert("path", "g")
            .attr("class", "treelink")
            .transition().duration(500)
            .attr("d", this.diagonal);

        link.exit().remove();

        if (this.graph.selection) {
            //updateDebug(this.treeSelection);
        }
    }

    this.selectionChanged = function(d) {

    }

    // Constructor:
    this.createTree();
}