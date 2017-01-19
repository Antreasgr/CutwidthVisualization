function linearLayout(graph, element, name, linked) {
    this.radius = 10;
    this.xscale = null;
    this.rscale = null;
    this.yfixed = 180;

    this.graph = graph;

    this.svgElement = element.append("svg");
    this.gElement = this.svgElement.append("g");
    this.nodesgElement = this.svgElement.append("g").attr("class", "nodes-group");
    this.linked = linked === false ? false : true;

    this.cuts = [];
    var self = this;

    this.layoutName = name ? name : this.graph.uuid();

    this.graph.addLayout(this);

    this.selectionChanged = function(d) {

    }

    /*
     * Gets the x, y position of a node on the linear layout
     */
    this.getXY = function(d, i) {
        var xy = { x: this.xscale(self.getOrder(d, i)), y: self.yfixed + d.y / 10 };
        return xy;
    }

    /*
     * Helper function to get the order in the layout of a datum(node)
     * @param d: datum
     * @param i: index
     */
    this.getOrder = function(d, i) {
        // if linked use the global order (d.order) else return the specific order of this layout (d[layoutName])
        i = i === "undefined" ? 0 : i;
        var o = self.linked ? d : (d[self.layoutName] = d[self.layoutName] || {});
        o.order = o.order != null ? o.order : i;
        return o.order;
    }

    /*
     * Helper function to set the order in the layout of a datum(node)
     * @param d: datum
     * @param value: the value to set
     */
    this.setOrder = function(d, value) {
        var o = this.linked ? d : (d[self.layoutName] = d[self.layoutName] || {});
        o.order = value;
    }

    /*
     * Main Method: Updates/Creates the everything that makes the linear layout
     */
    this.update = function() {
        // check if we have many orderings
        if (this.graph.order && this.graph.order.length > 0 && this.graph.order[0].length > 0) {
            this.minOrders = this.graph.order.slice();
            this.minOrderIndex = 0;
            this.graph.order = thisgraph.order[0];
        }

        this.rescale();

        // calculate pixel location for each node
        this.graph.nodes.forEach(function(d, i) {
            d[self.layoutName] = d[self.layoutName] || {};
            d[self.layoutName].position = self.getXY(d, i);
        });

        // draw links first, so nodes appear on top
        this.drawLinks();

        // draw nodes last
        this.drawNodes();

        // create the Cut text in the middle
        this.gElement.selectAll(".maxcut").data([0]).enter().append("text").attr("class", "maxcut").text(function(d) { return d; });
        this.updateCuts();

        this.drawCutlines();

        this.drawTooltipsB();

        this.updateHalfLine();

        // create arrow lines
        this.drawArrows();
    }

    this.updateHalfLine = function() {
        var nodesCopy = this.graph.nodes.slice();
        nodesCopy.sort(function(a, b) { return self.getOrder(a) - self.getOrder(b) });

        var size = nodesCopy.reduce((a, c) => a + c.size, 0);

        var half = Math.floor(size / 2.0);
        for (var i = 0; i < nodesCopy.length; i++) {
            half -= nodesCopy[i].size;
            if (half <= 0) {
                var halfline = this.gElement.selectAll(".halfline")
                    .data([half == 0 ? self.getOrder(nodesCopy[i], i) + 0.5 : self.getOrder(nodesCopy[i], i)]);

                halfline.transition().duration(500)
                    .attr("x1", function(d, i) { return self.xscale(d); })
                    .attr("x2", function(d, i) { return self.xscale(d); });

                halfline.enter()
                    .append("line")
                    .attr("class", "halfline")
                    .attr("x1", function(d, i) { return self.xscale(d); })
                    .attr("x2", function(d, i) { return self.xscale(d); })
                    .attr("y1", self.yfixed - 80)
                    .attr("y2", self.yfixed + 50);
                break;
            }
        }
    }

    this.rescale = function() {
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
            .domain([0, d3.max(this.graph.nodes, function(d) { return d.size; })])
            .range([4, this.radius]);
    }


    this.updateCuts = function() {
        this.cuts = [];
        var nodeArray = new Array(this.graph.nodes.length);

        this.nodesgElement.selectAll(".node").each(function(node, i) {
            var independentCut = 0;
            var left = 0;
            var right = 0;
            var j = self.getOrder(node);
            nodeArray[j] = node;

            self.gElement.selectAll(".link")
                .each(function(d, i) {
                    if ((self.getOrder(d.source) > j && self.getOrder(d.target) < j) ||
                        (self.getOrder(d.source) < j && self.getOrder(d.target) > j)) {
                        independentCut += d.source.size * d.target.size;
                    } else if (self.getOrder(d.source) == j) {
                        if (self.getOrder(d.target) < j) {
                            left += d.target.size;
                        } else
                            right += d.target.size;
                    } else if (self.getOrder(d.target) == j) {
                        if (self.getOrder(d.source) < j) {
                            left += d.source.size;
                        } else
                            right += d.source.size;
                    }
                });

            if (node != null) {
                var cut = 0;
                var fi = Number.MIN_VALUE;
                var fmaxes = [];
                var o = self.getOrder(node);
                var universalO = self.getOrder(self.graph.nodes[0]);

                for (var pp = 0; pp <= node.size; pp++) {
                    // Calculate cut
                    cut = Math.max(cut, pp * (node.size - pp) + pp * right + (node.size - pp) * left);

                    // Calculate fi or gi

                    if (o != universalO) {
                        var value = 0;
                        if (o < universalO) {
                            // if is left of U
                            value = pp * (node.size - pp) + pp * (right - self.graph.nodes[0].size) + (node.size - pp) * left + self.graph.nodes[0].size * pp;
                        } else if (o > universalO) {
                            //is right of U
                            value = pp * (node.size - pp) + pp * right + (node.size - pp) * (left - self.graph.nodes[0].size) + self.graph.nodes[0].size * (node.size - pp);
                        }
                        if (value > fi) {
                            fmaxes = [];
                            fmaxes.push(pp);
                            fi = value;
                        }
                    }
                }

                self.cuts.push(independentCut + cut);
                node.cut = independentCut + cut;

                node.bitonic = (right - left - node.size) / 2;

                node.nLeft = left;
                node.nRight = right;

                // Calculate the arrows
                node.moveLeft = false;
                node.moveRight = false;
                if (o < universalO) {
                    if (fmaxes.length == 1) {
                        if (fmaxes[0] > node.size - fmaxes[0]) {
                            // Li > Ri
                            node.moveRight = true;
                        } else if (fmaxes[0] < node.size - fmaxes[0]) {
                            node.moveLeft = true;
                        }
                    }
                } else if (o > universalO) {
                    if (fmaxes.length == 1) {
                        if (fmaxes[0] > node.size - fmaxes[0]) {
                            // Li > Ri
                            node.moveLeft = true;
                        } else if (fmaxes[0] < node.size - fmaxes[0]) {
                            node.moveRight = true;
                        }
                    }
                }
            } else {
                self.cuts.push(0);
            }
        });

        /*
            for (var i = 0; i < nodeArray.length; i++) {
            nodeArray[i].moveLeft = false;
            nodeArray[i].moveRight = false;
            var isLeftN = false;
            var isRightN = false;
            this.graph.links.forEach(function (link, LinkIndex) {
            if (i > 0) {
                if ((link.source.order == nodeArray[i].order && link.target.order == nodeArray[i - 1].order)
                    || (link.source.order == nodeArray[i - 1].order && link.target.order == nodeArray[i].order)) {
                    isLeftN = true;
                }
            }
            if (i < nodeArray.length - 1) {
                if ((link.source.order == nodeArray[i].order && link.target.order == nodeArray[i + 1].order)
                    || (link.source.order == nodeArray[i + 1].order && link.target.order == nodeArray[i].order)) {
                    isRightN = true;
                }
            }
            });
            if (i > 0) {
            var Dthis = isLeftN ? nodeArray[i].nRight - nodeArray[i].nLeft + nodeArray[i - 1].size : nodeArray[i].size * (nodeArray[i].nRight - nodeArray[i].nLeft);
            var DLeft = isLeftN ? nodeArray[i - 1].nRight - nodeArray[i - 1].nLeft - nodeArray[i].size : nodeArray[i - 1].size * (nodeArray[i - 1].nRight - nodeArray[i - 1].nLeft);
            nodeArray[i].moveLeft = (Dthis <= DLeft);
            }
            if (i < nodeArray.length - 1) {
            var Dthis = isRightN ? nodeArray[i].nRight - nodeArray[i].nLeft - nodeArray[i + 1].size : nodeArray[i].size * (nodeArray[i].nRight - nodeArray[i].nLeft);
            var DRight = isRightN ? nodeArray[i + 1].nRight - nodeArray[i + 1].nLeft + nodeArray[i].size : nodeArray[i + 1].size * (nodeArray[i + 1].nRight - nodeArray[i + 1].nLeft);
            nodeArray[i].moveRight = (DRight <= Dthis);
            }
            }
        */

        var txt = Math.max.apply(Math, self.cuts);
        if (this.graph.minimumCutwidth) {
            txt += " (" + this.graph.minimumCutwidth + ")";
        }

        var w = this.svgElement.node().getBoundingClientRect().width;
        this.gElement.select(".maxcut").text(txt).attr("x", w / 2).attr("y", pad + 10);
        return txt;
        // console.log(txt);
    }

    /* 
     * Draws nodes on plot
     */
    this.drawNodes = function() {
        // used to assign nodes color by group
        color = d3.scale.category10();

        var drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", function(d) { self.dragstart.call(self, this, d); })
            .on("drag", function(d) { self.dragmove.call(self, d); })
            .on("dragend", function(d) { self.dragend.call(self, this, d); });

        var node = this.nodesgElement.selectAll(".node")
            .data(this.graph.nodes, function(d) { return d.name; });

        node.transition().duration(500)
            .attr("cx", function(d, i) { return d[self.layoutName].position.x; })
            .attr("cy", function(d, i) { return d[self.layoutName].position.y; })
            .attr("r", function(d, i) { return self.rscale(d.size); })
            .style("fill", function(d, i) { return color(d.group1); })
            .style("stroke", function(d, i) { if (d.isu == 1) { return "#000"; } });

        node.enter()
            .append("circle")
            .attr("class", "node")
            .attr("id", function(d, i) { return d.name; })
            .attr("cx", function(d, i) { return d[self.layoutName].position.x; })
            .attr("cy", function(d, i) { return d[self.layoutName].position.y; })
            .attr("r", function(d, i) { return self.rscale(d.size); })
            .style("fill", function(d, i) { return color(d.group1); })
            .style("stroke", function(d, i) { if (d.isu == 1) { return "#000"; } })
            .on("mouseover", this.handleMouseOver)
            .on("mouseout", this.handleMouseOut)
            .call(drag);

        node.exit().remove();

        // draw size texts
        var tooltips = this.gElement.selectAll(".tooltip").data(this.graph.nodes, function(d) { return d.name; });

        tooltips.transition().duration(500).text(function(d) { return d.size; })
            .attr("x", function(d, i) { return d[self.layoutName].position.x; })
            .attr("y", function(d, i) { return d[self.layoutName].position.y; })
            .attr("dy", -this.radius * 1)

        tooltips.enter().append("text")
            .text(function(d) { return d.size; })
            .attr("x", function(d, i) { return d[self.layoutName].position.x; })
            .attr("y", function(d, i) { return d[self.layoutName].position.y; })
            .attr("dy", -this.radius * 1)
            .attr("circle", function(d) { return d.name; })
            .attr("class", "tooltip");

        tooltips.exit().remove();
        //fix tooltips offset
        this.gElement.selectAll(".tooltip").each(function(d) {
            var offset = this.getBBox().width / 2;

            if ((d.x - offset) < 0) {
                d3.select(this).attr("text-anchor", "start");
                d3.select(this).attr("dx", -radius);
            } else if ((d.x + offset) > (width - margin)) {
                d3.select(this).attr("text-anchor", "end");
                d3.select(this).attr("dx", radius);
            } else {
                d3.select(this).attr("text-anchor", "middle");
                d3.select(this).attr("dx", 0);
            }
        });
    }

    this.handleMouseOver = function(d, i) {
        d3.select(this).select("circle").style("stroke", "red");
        // TODO: fix selection on every layout
        self.graph.updateSelection(d);
    }

    this.handleMouseOut = function(d, i) {
        d3.select(this).select("circle").style("stroke", "");
        self.graph.updateSelection(null);
    }

    this.moveTo = function(d, newIndex) {
        var oldIndex = self.getOrder(d);

        this.graph.nodes.forEach(function(x, i) {
            var o = self.getOrder(x, i);
            if (o > oldIndex && o <= newIndex) {
                self.setOrder(x, o - 1);
            } else if (o < oldIndex && o >= newIndex) {
                self.setOrder(x, o + 1);
            }
        });

        self.setOrder(d, newIndex);

        this.update();
        this.graph.updateAll(this);
        return;
    }

    this.dragmove = function(d) {
        if (lock)
            return;
        if (self.xscale) {
            var mousex = d3.mouse(this.gElement.node())[0];
            var newIndex = Math.round(self.xscale.invert(mousex));
            newIndex = Math.min(Math.max(0, newIndex), this.graph.nodes.length - 1);

            if (newIndex != self.getOrder(d)) {
                lock = true;
                this.moveTo(d, newIndex);
                lock = false;
            }
        }
    }

    this.dragstart = function(d3node, d) {
        d3.select(d3node)
            .attr("r", self.rscale(d.size) * 1.5)
            .attr("cy", d[self.layoutName].position.y - 50);
    }

    this.dragend = function(d3node, d) {
        d3.select(d3node).attr("r", self.rscale(d.size)).attr("cy", d[self.layoutName].position.y);
    }

    /* 
     *  Draws nice arcs for each link on graph
     */
    this.drawLinks = function() {
        var color = color = d3.scale.category10();
        var linksSel = this.gElement.selectAll(".link").data(this.graph.links);

        linksSel.attr("d", drawlink)
            .attr("stroke-width", function(d) { return d.source.size * d.target.size / 2.0; })
            .attr("stroke", function(d) { return color(d.target.group1); })

        linksSel.enter().append("path").attr("class", "link")
            .attr("d", drawlink)
            .attr("stroke-width", function(d) { return d.source.size * d.target.size / 2.0; })
            .attr("stroke", function(d) { return color(d.target.group1); })

        linksSel.exit().remove();
    }

    /* 
     *  Helper function to draw curved link
     */
    function drawlink(d, i) {
        var dx = d.target[self.layoutName].position.x - d.source[self.layoutName].position.x,
            dy = d.target[self.layoutName].position.y - d.source[self.layoutName].position.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" +
            d.source[self.layoutName].position.x + "," +
            d.source[self.layoutName].position.y + "A" +
            dr + "," + (dr * 1.4) + " 0 0,1 " +
            d.target[self.layoutName].position.x + "," +
            d.target[self.layoutName].position.y;
    }

    /*
     * Called on resize of window
     */
    this.resize = function() {
        this.rescale();
    }

    this.drawCutlines = function() {
        // var cutLines = []
        // for (var i = 0; i < this.graph.nodes.length; i++) {
        //     cutLines.push(i + 0.5);
        // }

        // var cutlines = this.gElement.selectAll(".cuts").data(cutLines);

        // cutlines.transition().duration(500).attr("x1", function(d, i) { return self.xscale(i + 0.5); })
        //     .attr("x2", function(d, i) { return self.xscale(i + 0.5); })
        //     .attr("y1", self.yfixed - 50)
        //     .attr("y2", height);

        // cutlines.enter()
        //     .append("line")
        //     .attr("class", "cuts")
        //     .attr("x1", function(d, i) { return self.xscale(i + 0.5); })
        //     .attr("x2", function(d, i) { return self.xscale(i + 0.5); })
        //     .attr("y1", self.yfixed - 50)
        //     .attr("y2", height);

        // cutlines.exit().remove();

        var cutScaler = d3.scale.linear()
            .domain([d3.min(this.cuts), d3.max(this.cuts)])
            .range([0, 1]);

        colorText = d3.interpolateHsl(d3.rgb("#dadaeb"), d3.rgb("#756bb1"));

        var cutTexts = this.gElement.selectAll(".cutwidths")
            .data(this.graph.nodes, function(d) { return d.name; });

        cutTexts.transition().duration(500)
            .text(function(d, i) { return d.cut; })
            .attr("x", function(d, i) { return self.xscale(self.getOrder(d, i) + 0.5); })
            .attr("y", self.yfixed + 120)
            .attr("text-anchor", "end")
            .attr("fill", function(d, i) { return colorText(cutScaler(d.cut)); });

        cutTexts.enter()
            .append("text")
            .attr("class", "cutwidths")
            .text(function(d, i) { return d.cut; })
            .attr("x", function(d, i) { return self.xscale(self.getOrder(d, i) + 0.5); })
            .attr("y", self.yfixed + 120)
            .attr("text-anchor", "end")
            .attr("fill", function(d, i) { return colorText(cutScaler(d.cut)); });

        cutTexts.exit().remove();
    }

    this.drawTooltipsB = function() {
        // draw bitonic value
        // var tooltipsb = this.gElement.selectAll(".tooltipb").data(this.graph.nodes, function (d) { return d.name; });

        // tooltipsb.transition().duration(500).text(function (d) { return d.bitonic; })
        //     .attr("x", function (d) { return self.getXY(d).x; })
        //     .attr("y", function (d) { return self.getXY(d).y; })
        //     .attr("dy", this.radius * 1.5)

        // tooltipsb.enter().append("text")
        //     .text(function (d) { return d.bitonic; })
        //     .attr("x", function (d) { return self.getXY(d).x; })
        //     .attr("y", function (d) { return self.getXY(d).y; })
        //     .attr("dy", this.radius * 1.5)
        //     .attr("circle", function (d) { return d.name; })
        //     .attr("text-anchor", "middle")
        //     .attr("class", "tooltipb");

        // tooltipsb.exit().remove();

    }


    this.drawArrows = function() {
        //
        //var arrowsRight = this.gElement.selectAll(".arrowR").data(this.graph.nodes);
        //arrowsRight.transition().duration(500)
        //        .attr("x1", function (d) { return self.getXY(d).x; })
        //        .attr("y1", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("x2", function (d) { return self.getXY(d).x + self.radius; })
        //        .attr("y2", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("marker-end", function (d) { return (d.moveRight ? "url(#arrow)" : null); });

        //arrowsRight.enter()
        //        .append("svg:line")
        //        .attr("x1", function (d) { return self.getXY(d).x; })
        //        .attr("y1", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("x2", function (d) { return self.getXY(d).x + self.radius; })
        //        .attr("y2", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("class", "arrowR")
        //        .attr("marker-end", function (d) { return (d.moveRight ? "url(#arrow)" : null); });
        //arrowsRight.exit().remove();

        //var arrowsLeft = this.gElement.selectAll(".arrowL").data(this.graph.nodes);
        //arrowsLeft.transition().duration(500)
        //        .attr("x1", function (d) { return self.getXY(d).x; })
        //        .attr("y1", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("x2", function (d) { return self.getXY(d).x - self.radius; })
        //        .attr("y2", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("marker-end", function (d) { return (d.moveLeft ? "url(#arrow)" : null); });

        //arrowsLeft.data(this.graph.nodes).enter().append("svg:line")
        //        .attr("x1", function (d) { return self.getXY(d).x; })
        //        .attr("y1", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("x2", function (d) { return self.getXY(d).x - self.radius; })
        //        .attr("y2", function (d) { return self.getXY(d).y + self.radius * 2; })
        //        .attr("class", "arrowL")
        //        .attr("marker-end", function (d) { return (d.moveLeft ? "url(#arrow)" : null); });
        //arrowsLeft.exit().remove();
    }

    /*
     * Constructor
     */

    this.update();
}