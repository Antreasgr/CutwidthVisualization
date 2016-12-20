function BipartiteGraph(graph, gElement) {
    this.radius = 3;
    this.margin = { x: 100, y: 20 };
    this.gElement = gElement;

    this.diagonal = d3.svg.diagonal().projection(function (d) { return [d.x, d.y]; });

    this.line = d3.svg.line().x(function (point) { return point.x; }).y(function (point) { return point.y; });

    this.originalGraph = graph;

    this.createBipartiteGraph = function () {
        var nodes = {};
        var nodesArray = [];
        var links = [];

        for (var i = 0; i < this.originalGraph.links.length; i++) {
            var link = this.originalGraph.links[i];
            var s = link.source;
            var t = link.target;

            if (!nodes[t.name]) {
                nodes[t.name] = { name: t.name, sourceNode: t };
                nodesArray.push(nodes[t.name]);
            }

            if (!nodes[s.name]) {
                nodes[s.name] = { name: s.name, sourceNode: s };
                nodesArray.push(nodes[s.name]);
            }

            for (var j = 0; j < s.size * t.size; j++) {
                var extraNode = { name: s.name + "-" + t.name + "-" + j, sourceNode: null };
                if (nodes[extraNode.name]) {
                    // console.log(extraNode.name);
                    // console.log(link);
                }
                nodes[extraNode.name] = extraNode;
                nodesArray.push(nodes[extraNode.name]);

                links.push({ source: nodes[s.name], target: extraNode });
                links.push({ source: nodes[t.name], target: extraNode });
            }
        }

        this.graph = { nodes: nodesArray, links: links };
    }

    this.drawGraph = function () {
        var p = gElement; // d3.select("#bipartite");

        var yleft = 0, yright = 0;
        for (var i = 0; i < this.graph.nodes.length; i++) {
            if (this.graph.nodes[i].sourceNode) {
                this.graph.nodes[i].x = 10;
                this.graph.nodes[i].y = yleft;
                yleft += this.margin.y;
            }
            else {
                this.graph.nodes[i].x = 10 + this.margin.x;
                this.graph.nodes[i].y = yright;
                yright += this.margin.y;
            }
        }

        // Create nodes
        var dnodes = p.selectAll(".bp-node").data(this.graph.nodes, function (d) { return d.name; });


        // node.transition().duration(500).attr("cx", function (d, i) { return d.sourceNode ? 10 : 50; })
        //     .attr("cy", function (d, i) { d.sourceNode ? yleft +=ymargin : yright += ymargin; return d.sourceNode ? yleft: yright;  })

        dnodes.enter()
            .append("circle")
            .attr("class", "bp-node")
            .attr("id", function (d, i) { return d.name; })
            .attr("cx", function (d, i) { return d.x })
            .attr("cy", function (d, i) { return d.y })
            .attr("r", this.radius)
            .style("fill", function (d, i) { return d.sourceNode ? "#000" : "#fff" })
            .style("stroke", function (d, i) { return d.sourceNode ? null : "#000" });

        dnodes.exit().remove();

        // Create links
        // <path class="treelink" d="M278.70000000000005,100C278.70000000000005,150 232.25,150 232.25,200"></path>

        var dlinks = p.selectAll("path.bp-link").data(this.graph.links);

        // dlinks.transition().duration(500).attr("d", this.diagonal);

        var that = this;
        dlinks.enter().insert("path", "g")
            .attr("class", "bp-link")
            .transition().duration(500)
            .attr("d", function (d) { return that.line([{ x: d.source.x, y: d.source.y }, { x: d.target.x, y: d.target.y }]); });

        dlinks.exit().remove();
    }

    this.DynamicAlgorithm = function () {
        // display 
        var minDisplay = d3.select("#bipartite").selectAll(".maxcut").data(["Please wait"]);

        minDisplay.enter().append("text").attr("id", "max-bp").attr("class", "maxcut")
            .attr("x", window.innerWidth * 0.2 / 2).attr("y", -10)
            .text(function (d) { return d; });

        for (var i = 0; i < this.graph.nodes.length; i++) {
            this.graph.nodes[i].size = 1;
        }

        var that = this;
        setTimeout(function () {
            var min = DynamicAlgorithm.DynamicCutWidth(that.graph, DynamicAlgorithm.fCutWidth);

            var m = d3.select("#bipartite").selectAll(".maxcut").data([min.Value]);
            m.text(function (d) { return d; });
        });
    }
}