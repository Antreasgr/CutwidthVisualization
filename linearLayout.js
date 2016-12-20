function linearLayout(graph, svgElement, tree) {

    this.radius = 10;
    this.xscale = null;
    this.rscale = null;
    this.radians = null;
    this.yfixed = 80;

    this.graph = graph;
    this.length = graph.nodes.length;
    this.svgElement = svgElement;
    this.gElement = svgElement.append("g").attr("id", "plotG");
    this.tree = tree;

    //for min Orderings from import
    this.minOrders = null;
    this.minOrderIndex = 0;

    this.cuts = [];
    var self = this;

    this.addNode = function (child) {
        // d must have correct stuff
        this.length++;

        this.graph.nodes.push(child);
        // we need to add the links too
        var t = child;
        while (t.parent != null && t.parent != "null") {
            this.graph.links.push({ source: child, target: t.parent });
            t = t.parent;
        }

        this.initialize(this.graph);
    }

    this.updateSize = function () {
        this.initialize(this.graph);
    }

    this.moveToNextOrdering = function (prev) {
        var changed = false;
        if (prev == true) {
            if (this.minOrderIndex > 0) {
                this.minOrderIndex--;
                changed = true;
            }
        }
        else {
            if (this.minOrderIndex < this.minOrders.length - 1) {
                this.minOrderIndex++;
                changed = true;
            }
        }

        console.log(this.minOrderIndex);
        if (changed) {
            var _this = this;
            this.graph.nodes.forEach(function (d, i) {
                d.order = _this.minOrders[_this.minOrderIndex][i];
            });

            this.initialize(this.graph);
            this.tree.updateTree();
        }

    }

    this.removeNodes = function (nodes) {
        this.length -= nodes.length;

        for (var n = 0; n < nodes.length; n++) {
            //remove links
            for (var i = this.graph.links.length - 1; i >= 0; i--) {
                if (this.graph.links[i].source === nodes[n] || this.graph.links[i].target === nodes[n]) {
                    this.graph.links.splice(i, 1);
                }
            }

            // now remove node
            for (var i = this.graph.nodes.length - 1; i >= 0; i--) {
                if (this.graph.nodes[i] === nodes[n]) {
                    var o = this.graph.nodes[i].order;
                    this.graph.nodes.splice(i, 1);

                    for (var j = 0; j < this.graph.nodes.length; j++) {
                        if (this.graph.nodes[j].order > o)
                            this.graph.nodes[j].order--;
                    }
                }
            }
        }

        this.initialize(this.graph);
    }

    this.getXY = function (datum) {
        return { x: this.xscale(datum.order), y: self.yfixed + datum.y / 10 };
    }

    this.initialize = function () {
        // check if we have many orderings
        if (graph.order && graph.order.length > 0 && graph.order[0].length > 0) {
            this.minOrders = graph.order.slice();
            this.minOrderIndex = 0;
            this.graph.order = graph.order[0];
        }

        //this.radius = Math.max(4, Math.min(15, (width / (this.length)) - pad));

        // must be done AFTER links are fixed
        this.rescale();

        // calculate pixel location for each node
        var that = this;
        this.graph.nodes.forEach(function (d, i) {
            if (d.order != null) {
                d.r = that.rscale(d.size);
            } else {
                if (that.graph.order && that.graph.order.length >= that.graph.nodes.length) {
                    d.order = that.graph.order[i];
                }
                else {
                    d.order = i;
                }
                d.r = that.rscale(d.size);
            }
        });

        // draw links first, so nodes appear on top
        this.drawLinks();

        // draw nodes last
        this.drawNodes();

        var cutLines = []
        for (var i = 0; i < this.graph.nodes.length; i++) {
            cutLines.push(i + 0.5);
        }

        var cutlines = this.gElement.selectAll(".cuts").data(cutLines);

        cutlines.transition().duration(500).attr("x1", function (d, i) { return that.xscale(i + 0.5); })
            .attr("x2", function (d, i) { return that.xscale(i + 0.5); })
            .attr("y1", self.yfixed - 50)
            .attr("y2", height);

        cutlines.enter()
            .append("line")
            .attr("class", "cuts")
            .attr("x1", function (d, i) { return that.xscale(i + 0.5); })
            .attr("x2", function (d, i) { return that.xscale(i + 0.5); })
            .attr("y1", self.yfixed - 50)
            .attr("y2", height);

        cutlines.exit().remove();

        this.gElement.selectAll(".maxcut").data([0]).enter().append("text").attr("class", "maxcut").text(function (d) { return d; });
        this.gElement.selectAll(".maxcut").data([0]).exit().remove();

        this.updateCuts();


        // draw bitonic value
        // var tooltipsb = this.gElement.selectAll(".tooltipb").data(this.graph.nodes, function (d) { return d.name; });

        // tooltipsb.transition().duration(500).text(function (d) { return d.bitonic; })
        //     .attr("x", function (d) { return that.getXY(d).x; })
        //     .attr("y", function (d) { return that.getXY(d).y; })
        //     .attr("dy", this.radius * 1.5)

        // tooltipsb.enter().append("text")
        //     .text(function (d) { return d.bitonic; })
        //     .attr("x", function (d) { return that.getXY(d).x; })
        //     .attr("y", function (d) { return that.getXY(d).y; })
        //     .attr("dy", this.radius * 1.5)
        //     .attr("circle", function (d) { return d.name; })
        //     .attr("text-anchor", "middle")
        //     .attr("class", "tooltipb");

        // tooltipsb.exit().remove();

        var cutScaler = d3.scale.linear()
            .domain([d3.min(this.cuts), d3.max(this.cuts)])
            .range([0, 1]);

        colorText = d3.interpolateHsl(d3.rgb("#dadaeb"), d3.rgb("#756bb1"));

        var cutTexts = this.gElement.selectAll(".cutwidths")
            .data(this.graph.nodes, function (d) { return d.name; });

        cutTexts.transition().duration(500)
            .text(function (d, i) { return d.cut; })
            .attr("x", function (d, i) { return that.xscale(d.order + 0.5); })
            .attr("y", height - 120)
            .attr("text-anchor", "end")
            .attr("fill", function (d, i) { return colorText(cutScaler(d.cut)); });

        cutTexts.enter()
            .append("text")
            .attr("class", "cutwidths")
            .text(function (d, i) { return d.cut; })
            .attr("x", function (d, i) { return that.xscale(d.order + 0.5); })
            .attr("y", height - 120)
            .attr("text-anchor", "end")
            .attr("fill", function (d, i) { return colorText(cutScaler(d.cut)); });

        cutTexts.exit().remove();

        this.updateHalfLine();
        // create arrow lines
        this.updateArrows();

        updateDebug(null);
    }

    this.updateHalfLine = function () {
        var nodesCopy = this.graph.nodes.slice();
        nodesCopy.sort(function (a, b) { return a.order - b.order });

        var size = 0;
        for (var i = 0; i < nodesCopy.length; i++) {
            size += nodesCopy[i].size;
        }

        var that = this;

        var half = Math.floor(size / 2.0);
        for (var i = 0; i < nodesCopy.length; i++) {
            half -= nodesCopy[i].size;
            if (half <= 0) {
                var halfline = this.gElement.selectAll(".halfline")
                    .data([half == 0 ? nodesCopy[i].order + 0.5 : nodesCopy[i].order]);


                halfline.transition().duration(500)
                    .attr("x1", function (d, i) { return that.xscale(d); })
                    .attr("x2", function (d, i) { return that.xscale(d); });

                halfline.enter()
                    .append("line")
                    .attr("class", "halfline")
                    .attr("x1", function (d, i) { return that.xscale(d); })
                    .attr("x2", function (d, i) { return that.xscale(d); })
                    .attr("y1", self.yfixed - 80)
                    .attr("y2", self.yfixed + 50);
                break;
            }
        }

    }

    this.rescale = function () {
        var w = this.svgElement.node().getBoundingClientRect().width;

        // used to scale node index to x position\
        var dm = [0, this.graph.nodes.length - 1 + 0.5]
        if (this.graph.nodes.length == 1) {
            dm = [0, 0];
        }

        this.xscale = d3.scale.linear()
            .domain(dm)
            .range([pad, w - pad]);

        this.rscale = d3.scale.linear()
            .domain([0, d3.max(this.graph.nodes, function (d) { return d.size; })])
            .range([4, this.radius]);

        // scale to generate radians (just for lower-half of circle)
        this.radians = d3.scale.linear()
            .range([3 * Math.PI / 4, 5 * Math.PI / 4]);
    }

    this.updateArrows = function () {
        //var that = this;
        //var arrowsRight = this.gElement.selectAll(".arrowR").data(this.graph.nodes);
        //arrowsRight.transition().duration(500)
        //        .attr("x1", function (d) { return that.getXY(d).x; })
        //        .attr("y1", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("x2", function (d) { return that.getXY(d).x + that.radius; })
        //        .attr("y2", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("marker-end", function (d) { return (d.moveRight ? "url(#arrow)" : null); });

        //arrowsRight.enter()
        //        .append("svg:line")
        //        .attr("x1", function (d) { return that.getXY(d).x; })
        //        .attr("y1", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("x2", function (d) { return that.getXY(d).x + that.radius; })
        //        .attr("y2", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("class", "arrowR")
        //        .attr("marker-end", function (d) { return (d.moveRight ? "url(#arrow)" : null); });
        //arrowsRight.exit().remove();

        //var arrowsLeft = this.gElement.selectAll(".arrowL").data(this.graph.nodes);
        //arrowsLeft.transition().duration(500)
        //        .attr("x1", function (d) { return that.getXY(d).x; })
        //        .attr("y1", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("x2", function (d) { return that.getXY(d).x - that.radius; })
        //        .attr("y2", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("marker-end", function (d) { return (d.moveLeft ? "url(#arrow)" : null); });

        //arrowsLeft.data(this.graph.nodes).enter().append("svg:line")
        //        .attr("x1", function (d) { return that.getXY(d).x; })
        //        .attr("y1", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("x2", function (d) { return that.getXY(d).x - that.radius; })
        //        .attr("y2", function (d) { return that.getXY(d).y + that.radius * 2; })
        //        .attr("class", "arrowL")
        //        .attr("marker-end", function (d) { return (d.moveLeft ? "url(#arrow)" : null); });
        //arrowsLeft.exit().remove();
    }

    this.updateCuts = function () {
        this.cuts = [];

        var that = this;

        var nodeArray = new Array(this.length);

        this.gElement.selectAll(".node").each(function (node, i) {
            var independentCut = 0;
            var left = 0;
            var right = 0;
            var j = node.order;
            nodeArray[node.order] = node;

            that.gElement.selectAll(".link")
                .each(function (d, i) {
                    if ((d.source.order > j && d.target.order < j) || (d.source.order < j && d.target.order > j)) {
                        independentCut += d.source.size * d.target.size;
                    }
                    else if (d.source.order == j) {
                        if (d.target.order < j) {
                            left += d.target.size;
                        }
                        else
                            right += d.target.size;
                    }
                    else if (d.target.order == j) {
                        if (d.source.order < j) {
                            left += d.source.size;
                        }
                        else
                            right += d.source.size;
                    }
                });

            if (node != null) {
                var cut = 0;
                var fi = Number.MIN_VALUE;
                var fmaxes = [];

                for (var pp = 0; pp <= node.size; pp++) {
                    // Calculate cut
                    cut = Math.max(cut, pp * (node.size - pp) + pp * right + (node.size - pp) * left);

                    // Calculate fi or gi
                    if (node.order != that.graph.nodes[0].order) {
                        var value = 0;
                        if (node.order < that.graph.nodes[0].order) {
                            // if is left of U
                            value = pp * (node.size - pp) + pp * (right - that.graph.nodes[0].size) + (node.size - pp) * left + that.graph.nodes[0].size * pp;
                        }
                        else if (node.order > that.graph.nodes[0].order) {
                            //is right of U
                            value = pp * (node.size - pp) + pp * right + (node.size - pp) * (left - that.graph.nodes[0].size) + that.graph.nodes[0].size * (node.size - pp);
                        }
                        if (value > fi) {
                            fmaxes = [];
                            fmaxes.push(pp);
                            fi = value;
                        }
                    }
                }
                that.cuts.push(independentCut + cut);
                node.cut = independentCut + cut;

                node.bitonic = (right - left - node.size) / 2;

                node.nLeft = left;
                node.nRight = right;

                // Calculate the arrows
                node.moveLeft = false;
                node.moveRight = false;
                if (node.order < that.graph.nodes[0].order) {
                    if (fmaxes.length == 1) {
                        if (fmaxes[0] > node.size - fmaxes[0]) {
                            // Li > Ri
                            node.moveRight = true;
                        }
                        else if (fmaxes[0] < node.size - fmaxes[0]) {
                            node.moveLeft = true;
                        }
                    }
                }
                else if (node.order > that.graph.nodes[0].order) {
                    if (fmaxes.length == 1) {
                        if (fmaxes[0] > node.size - fmaxes[0]) {
                            // Li > Ri
                            node.moveLeft = true;
                        }
                        else if (fmaxes[0] < node.size - fmaxes[0]) {
                            node.moveRight = true;
                        }
                    }
                }
            }
            else {
                that.cuts.push(0);
            }
        });

        // for (var i = 0; i < nodeArray.length; i++) {
        // nodeArray[i].moveLeft = false;
        // nodeArray[i].moveRight = false;
        // var isLeftN = false;
        // var isRightN = false;
        // this.graph.links.forEach(function (link, LinkIndex) {
        //    if (i > 0) {
        //        if ((link.source.order == nodeArray[i].order && link.target.order == nodeArray[i - 1].order)
        //            || (link.source.order == nodeArray[i - 1].order && link.target.order == nodeArray[i].order)) {
        //            isLeftN = true;
        //        }
        //    }
        //    if (i < nodeArray.length - 1) {
        //        if ((link.source.order == nodeArray[i].order && link.target.order == nodeArray[i + 1].order)
        //            || (link.source.order == nodeArray[i + 1].order && link.target.order == nodeArray[i].order)) {
        //            isRightN = true;
        //        }
        //    }
        // });
        // if (i > 0) {
        //    var Dthis = isLeftN ? nodeArray[i].nRight - nodeArray[i].nLeft + nodeArray[i - 1].size : nodeArray[i].size * (nodeArray[i].nRight - nodeArray[i].nLeft);
        //    var DLeft = isLeftN ? nodeArray[i - 1].nRight - nodeArray[i - 1].nLeft - nodeArray[i].size : nodeArray[i - 1].size * (nodeArray[i - 1].nRight - nodeArray[i - 1].nLeft);
        //    nodeArray[i].moveLeft = (Dthis <= DLeft);
        // }
        // if (i < nodeArray.length - 1) {
        //    var Dthis = isRightN ? nodeArray[i].nRight - nodeArray[i].nLeft - nodeArray[i + 1].size : nodeArray[i].size * (nodeArray[i].nRight - nodeArray[i].nLeft);
        //    var DRight = isRightN ? nodeArray[i + 1].nRight - nodeArray[i + 1].nLeft + nodeArray[i].size : nodeArray[i + 1].size * (nodeArray[i + 1].nRight - nodeArray[i + 1].nLeft);
        //    nodeArray[i].moveRight = (DRight <= Dthis);
        // }
        // }

        var txt = Math.max.apply(Math, that.cuts);
        if (this.graph.minimumCutwidth) {
            txt += " (" + this.graph.minimumCutwidth + ")";
        }

        var w = this.svgElement.node().getBoundingClientRect().width;
        d3.select(".maxcut").text(txt).attr("x", w / 2).attr("y", pad + 10);
        // console.log(txt);
    }

    // Draws nodes on plot
    this.drawNodes = function () {
        // used to assign nodes color by group
        color = d3.scale.category20();

        var that = this;

        var drag = d3.behavior.drag()
            .origin(function (d) { return d; })
            .on("dragstart", function (d) { that.dragstart.call(that, this, d); })
            .on("drag", function (d) { that.dragmove.call(that, d); })
            .on("dragend", function (d) { that.dragend.call(that, this, d); });

        var node = this.gElement.selectAll(".node")
            .data(this.graph.nodes, function (d) { return d.name; });

        node.transition().duration(500).attr("cx", function (d, i) { return that.getXY(d).x; })
            .attr("cy", function (d, i) { return that.getXY(d).y; })
            .attr("r", function (d, i) { return that.rscale(d.size); })
            .style("fill", function (d, i) { return color(d.group1); })
            .style("stroke", function (d, i) { if (d.isu == 1) { return "#000"; } });


        node.enter()
            .append("circle")
            .attr("class", "node")
            .attr("id", function (d, i) { return d.name; })
            .attr("cx", function (d, i) { return that.getXY(d).x; })
            .attr("cy", function (d, i) { return that.getXY(d).y;; })
            .attr("r", function (d, i) { return that.rscale(d.size); })
            .style("fill", function (d, i) { return color(d.group1); })
            .style("stroke", function (d, i) { if (d.isu == 1) { return "#000"; } })
            .on("mouseover", this.handleMouseOver)
            .on("mouseout", this.handleMouseOut)
            .call(drag);

        node.exit().remove();

        // draw size texts
        var tooltips = this.gElement.selectAll(".tooltip").data(this.graph.nodes, function (d) { return d.name; });

        tooltips.transition().duration(500).text(function (d) { return d.size; })
            .attr("x", function (d) { return that.getXY(d).x; })
            .attr("y", function (d) { return that.getXY(d).y; })
            .attr("dy", -this.radius * 1)

        tooltips.enter().append("text")
            .text(function (d) { return d.size; })
            .attr("x", function (d) { return that.getXY(d).x; })
            .attr("y", function (d) { return that.getXY(d).y; })
            .attr("dy", -this.radius * 1)
            .attr("circle", function (d) { return d.name; })
            .attr("class", "tooltip");

        tooltips.exit().remove();
        //fix tooltips offset
        this.gElement.selectAll(".tooltip").each(function (d) {
            var offset = this.getBBox().width / 2;

            if ((d.x - offset) < 0) {
                d3.select(this).attr("text-anchor", "start");
                d3.select(this).attr("dx", -radius);
            }
            else if ((d.x + offset) > (width - margin)) {
                d3.select(this).attr("text-anchor", "end");
                d3.select(this).attr("dx", radius);
            }
            else {
                d3.select(this).attr("text-anchor", "middle");
                d3.select(this).attr("dx", 0);
            }
        });
    }

    this.handleMouseOver = function (d, i) {
        d3.select(this).select("circle").style("stroke", "red");
        self.tree.treeSelection = d;
    }

    this.handleMouseOut = function (d, i) {
        d3.select(this).select("circle").style("stroke", "");
        self.tree.treeSelection = null;
    }

    this.moveTo = function (d, newIndex) {
        var oldIndex = d.order;
        var that = this;
        var texts = [];

        this.gElement.selectAll(".node")
            .each(function (x, i) {
                if (x.order > oldIndex && x.order <= newIndex) {
                    x.order -= 1;
                }
                else if (x.order < oldIndex && x.order >= newIndex) {
                    x.order += 1;
                }
            });

        d.order = newIndex;

        this.gElement.selectAll(".node")
            .transition().duration(500)
            .attr("cx", function (dd, i) { return that.getXY(dd).x; })
            .each(function (x, i) {
                texts[x.order] = x.size;
            }
            );

        this.updateHalfLine();

        this.drawLinks();

        this.updateCuts();

        var cutScaler = d3.scale.linear()
            .domain([d3.min(this.cuts), d3.max(this.cuts)])
            .range([0, 1]);

        this.gElement.selectAll(".cutwidths").data(this.graph.nodes, function (d) { return d.name; })
            .text(function (d, i) { return d.cut; })
            .attr("x", function (d, i) { return self.xscale(d.order + 0.5); })
            .attr("y", height - 120)
            .attr("text-anchor", "end")
            .attr("fill", function (d, i) { return colorText(cutScaler(d.cut)); });


        var tooltips = this.gElement.selectAll(".tooltip").data(this.graph.nodes, function (d) { return d.name; });
        tooltips.transition().duration(500).text(function (d) { return d.size; })
            .attr("x", function (d) { return that.getXY(d).x; })
            .attr("y", function (d) { return that.getXY(d).y; })
            .attr("dy", -this.radius * 1);

        // var tooltipsb = this.gElement.selectAll(".tooltipb").data(this.graph.nodes, function (d) { return d.name; });
        // tooltipsb.transition().duration(500).text(function (d) { return d.bitonic; })
        //     .attr("x", function (d) { return that.getXY(d).x; });

        this.updateArrows();

        this.tree.updateTree();
    }

    this.dragmove = function (d) {
        if (lock)
            return;
        if (self.xscale) {
            var mousex = d3.mouse(this.gElement.node())[0];
            var newIndex = Math.round(self.xscale.invert(mousex));

            if (newIndex < 0)
                newIndex = 0;
            if (newIndex > this.length - 1)
                newIndex = this.length - 1;

            if (newIndex != d.order) {
                lock = true;
                this.moveTo(d, newIndex);
                lock = false;
            }
        }
    }

    this.dragstart = function (d3node, d) {
        d3.select(d3node)
            .attr("r", d.r * 1.5)
            .attr("cy", self.getXY(d).y - 50);
    }

    this.dragend = function (d3node, d) {
        d3.select(d3node).attr("r", d.r).attr("cy", self.getXY(d).y);
    }

    // Draws nice arcs for each link on plot
    this.drawLinks = function () {

        var that = this;
        // path generator for arcs (uses polar coordinates)
        arc = d3.svg.line.radial()
            .interpolate("basis")
            .tension(0)
            .angle(function (d) { return that.radians(d); });

        // add links
        var linksSel = this.gElement.selectAll(".link")
            .data(this.graph.links);

        linksSel
            .attr("transform", linkTransform)
            .attr("d", linkd);

        linksSel.exit().remove();

        linksSel.enter()
            .append("path")
            .attr("class", "link")
            .attr("transform", linkTransform)
            .attr("d", linkd);
    }

    function linkTransform(d, i) {
        var x1 = self.getXY(d.source).x;
        var x2 = self.getXY(d.target).x;
        var y1 = self.getXY(d.source).y;
        if (x1 > x2){
            var tmp = x1;
            x1 = x2;
            x2 = tmp;
        }

        // get x distance between source and target
        var xdist = x2 - x1;

        // set arc radius based on x distance
        var r = xdist * Math.SQRT1_2;

        // arc will always be drawn around (0, 0)
        var xshift = x1 + r * Math.sin(Math.PI / 4);
        var yshift = y1 + 50 - r * Math.cos(Math.PI / 4);
        console.log(y1);
        return "translate(" + xshift + ", " + yshift + ")";
    }

    function linkd(d, i) {
        // get x distance between source and target
        var xdist = Math.abs(self.getXY(d.source).x - self.getXY(d.target).x);

        // set arc radius based on x distance
        arc.radius(xdist / 2);

        // want to generate 1/3 as many points per pixel in x direction
        var points = d3.range(0, Math.ceil(xdist / 3));

        // set radian scale domain
        self.radians.domain([0, points.length - 1]);

        // return path for arc
        return arc(points);
    }
}