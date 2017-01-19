function lvl1Graph(parentGraph) {
    var self = this;
    this.parentGraph = parentGraph;
    this.layouts = [];

    var lvl1Links = getLinks();

    this.graph = new genericGraph(parentGraph.nodes, lvl1Links);
    this.nodes = parentGraph.nodes;
    this.links = lvl1Links;

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

    this.addNode = function(d) {
        this.links = getLinks();
        this.graph.links = this.links;
        this.minimumCutwidth = null;
    }

    this.removeNode = function(d) {
        this.links = getLinks();
        this.graph.links = this.links;
        this.minimumCutwidth = null;
    }

    function getLinks() {
        return self.parentGraph.links.filter(e => e.source.parent == null || e.target.parent == null);
    }
}