function lvl1Graph(parentGraph) {
    this.parentGraph = parentGraph;
    this.layouts = [];

    var lvl1Links = parentGraph.links.filter(function(e) {
        var d1 = Math.max(e.source.depth, e.target.depth);
        var d2 = Math.min(e.source.depth, e.target.depth);
        return d2 == 0;
    });

    this.graph = new genericGraph(parentGraph.nodes, lvl1Links);
    this.nodes = parentGraph.nodes;
    this.links = lvl1Links;
    var self = this;

    this.addLayout = function(layout) {
        layout.graph = this.graph;
        this.layouts.push(layout);
    }

    this.graph.updateAll = function() {
        self.parentGraph.updateAll(self);
    }

    this.svgKeyDown = function() {
        if (d3.event.shiftKey && d3.event.keyCode == 69) {
            // e key
            this.graph.DynamicCutWidth(this.graph);
            this.minimumCutwidth = this.graph.minimumCutwidth.Value;
            this.parentGraph.updateAll();
        }
    }
}