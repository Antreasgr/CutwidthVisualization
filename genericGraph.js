function genericGraph(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    this.selection = null;
    this.layouts = [];
    this.linkedGraphs = [];

    var self = this;
    var lock = false;

    // for min Orderings from import
    this.minOrders = null;
    this.minOrderIndex = 0;

    // fix graph links to map to objects instead of indices
    this.links.forEach(function(d, i) {
        d.source = isNaN(d.source) ? d.source : self.nodes[d.source];
        d.target = isNaN(d.target) ? d.target : self.nodes[d.target];
    });

    var allL = [];
    this.getAllLayouts = function(force) {
        if (allL.length == 0 || force) {
            var l = this.linkedGraphs.map((a) => a.layouts);
            allL = l.reduce((p, n) => p.concat(n), []);
            allL.push.apply(allL, this.layouts);
        }

        return allL;
    }

    this.addLayout = function(layout) {
        this.layouts.push(layout);
        this.getAllLayouts(true);
    }

    this.addLinkedGraph = function(graph) {
        this.linkedGraphs.push(graph);
        this.getAllLayouts(true);
    }

    this.updateAll = function(caller, resize) {
        // console.log("--------------------------------------------------------");
        var allLayouts = this.getAllLayouts();
        for (var i = 0; i < allLayouts.length; i++) {
            if (!caller || allLayouts[i] !== caller) {
                allLayouts[i].update();
            }

            if (resize) {
                allLayouts[i].resize();
            }
        }
    }

    this.graphUpdated = function() {
        var allLayouts = this.getAllLayouts();
        for (var i = 0; i < allLayouts.length; i++) {
            allLayouts[i].onGraphUpdated();
        }
    }

    this.createlvl1Graph = function() {
        var g = new lvl1Graph(this);
        this.addLinkedGraph(g);
        return g;
    }

    this.svgKeyDown = function() {
        if (lock)
            return;
        if (this.selection) {
            d3.event.stopPropagation();
            if (d3.event.keyCode == 107 || d3.event.keyCode == 61) {
                // + pressed
                this.selection.size++;
                this.minimumCutwidth = null;
                this.updateAll();
            } else if ((d3.event.keyCode == 109 || d3.event.keyCode == 173) && this.selection.size > 0) {
                // - pressed
                this.selection.size--;
                this.minimumCutwidth = null;
                this.updateAll();
            } else if (d3.event.keyCode == 79) {
                /*
                    o pressed run polynomial ALGORITHM
                    lock = true;
                    this.BestOrder(this.selection);
                    this.ArrangeAll();
                    this.updateAll();
                    lock = false;
                */
            }
        }

        if (d3.event.keyCode == 192) {
            // ~ pressed
            $(".well.debug").slideToggle();
        }

        if (d3.event.shiftKey && d3.event.keyCode == 188) {
            // ,
            if (this.minOrders != null) {
                this.moveToNextOrdering(true);
            }
        }

        if (d3.event.shiftKey && d3.event.keyCode == 190) {
            // .
            if (this.minOrders != null) {
                this.moveToNextOrdering(false);
            }
        }

        if (d3.event.shiftKey && d3.event.keyCode == 68) {
            // d key
            this.DynamicCutWidth(this);
        }

        // if (d3.event.shiftKey && d3.event.keyCode == 66) {
        //     // b key
        //     bpGraph.DynamicAlgorithm();
        // }

        if (d3.event.shiftKey && d3.event.keyCode == 84) {
            // t
            this.ThesholdOrder();
        }

        if (this.linkedGraphs.length > 0) {
            for (var i = 0; i < this.linkedGraphs.length; i++) {
                this.linkedGraphs[i].svgKeyDown();
            }
        }
    }

    this.treeclick = function(d, i) {
        d3.event.stopPropagation();
        if (lock)
            return;
        lock = true;
        this.minimumCutwidth = null;
        if (d3.event.altKey) {
            this.removeNodes(d);
        } else {
            //add a children
            this.addNode(d);
        }

        lock = false;
    }

    this.svgKeyUp = function() {
        d3.event.stopPropagation();
    }

    this.updateSelection = function(d) {
        this.selection = d;

        var allLayouts = this.getAllLayouts();
        for (var i = 0; i < allLayouts.length; i++) {
            allLayouts[i].selectionChanged(d);
        }
    }

    this.addNode = function(d) {
        if (!d.children) {
            d.children = [];
            d.group1 = this.nodes.length;
        }

        // find next available name
        var newName = this.uuid();

        var child = {
            name: newName,
            parent: d,
            size: 1,
            x: 0,
            y: 0,
            order: this.nodes.length,
            group1: d.group1
        };

        d.children.push(child);
        this.nodes.push(child);
        // we need to add the links too
        var t = child;
        while (t.parent) {
            this.links.push({ source: child, target: t.parent });
            t = t.parent;
        }

        for (var i = 0; i < this.linkedGraphs.length; i++) {
            var g = this.linkedGraphs[i];
            g.addNode(d);
        }

        this.graphUpdated();
        this.updateAll();
    }

    this.removeNodes = function(d) {
        //remove this node and children
        //TODO: fix remove nodes
        //cannot remove the root node
        if (d.parent) {
            var removed = [];

            for (var i = d.parent.children.length - 1; i >= 0; i--) {
                if (d.parent.children[i] === d) {
                    removed.push(d.parent.children[i]);
                    d.parent.children.splice(i, 1);
                }
            }

            if (d.children) {
                var stack = [d];

                var n = stack.pop();
                while (n != null && n.children != null && n.children.length > 0) {
                    for (var i = 0; i < n.children.length; i++) {
                        removed.push(n.children[i]);
                        if (n.children[i].children) {
                            stack.push(n.children[i]);
                        }
                    }

                    n.children = null;
                    n = stack.pop();
                }
            }

            this.links = this.links.filter(l => removed.indexOf(l.source) < 0 && removed.indexOf(l.target) < 0);
            this.nodes = this.nodes.filter(n => removed.indexOf(n) < 0);

            for (var i = 0; i < this.linkedGraphs.length; i++) {
                var g = this.linkedGraphs[i];
                g.removeNodes(d);
            }

            this.graphUpdated();
            this.updateAll();
        }
    }

    this.moveToNextOrdering = function(prev) {
        var changed = false;
        if (prev == true) {
            if (this.minOrderIndex > 0) {
                this.minOrderIndex--;
                changed = true;
            }
        } else {
            if (this.minOrderIndex < this.minOrders.length - 1) {
                this.minOrderIndex++;
                changed = true;
            }
        }

        console.log(this.minOrderIndex);
        if (changed) {
            var _this = this;
            this.nodes.forEach(function(d, i) {
                d.order = _this.minOrders[_this.minOrderIndex][i];
            });

            this.updateAll();
        }
    }

    /*
     * Polynomial Algorithm
     */
    this.BestOrder = function(rootNode) {
        // This is where the magic happens
        // rootNode is where to start running

        var stack = [];
        // Initialize a stack of all the nodes
        function add(n) {
            if (n != null)
                stack.push(n);
            if (n.children && n.children.length > 0) {
                for (var i = 0; i < n.children.length; i++) {
                    add(n.children[i]);
                }
            }
        }

        add(rootNode);

        // Loop for all nodes
        while ((node = stack.pop()) != null) {
            if (node.children == null || node.children.length == 0) {
                // this node has no childs it is a simple clique
                node.ci = [];
                node.fi = -Number.MAX_VALUE;
                for (var x = 1; x <= node.size; x++) {
                    node.ci.push(x * (node.size - x));
                    if (node.parent && x != node.size) {
                        node.fi = Math.max(node.fi, x * (node.size - x) + node.parent.size * (x));
                    }
                }
                // console.log(node);
            } else {
                // this is the root of a subTree

                // sort children by reverse fi order
                var sortedChildren = node.children.slice().sort(function(a, b) { return b.fi - a.fi; });

                // initialize the array
                var n = 0;
                for (var i = 0; i < sortedChildren.length; i++) {
                    n += sortedChildren[i].ci.length;
                }

                var A = [];
                for (var x = 0; x <= sortedChildren.length; x++) {
                    A[x] = [];
                    for (var y = 0; y <= n; y++) {
                        A[x][y] = { Value: null, Order: [] };
                    }
                }

                // Calculate bitonic ordering
                // Ni: einai o trexwn arithmos komvwn pou exoun eksetastei
                // i: einai h seira pou eimaste sto pinaka A , diladi i trexousa klika, alla seira 0 einai i kamia klika
                // previ: einai deikths gia to for se ola ta paidia tou trexontws komvou
                var ni = 0;
                for (var previ = 0; previ < sortedChildren.length; previ++) {
                    var child = sortedChildren[previ];
                    var i = previ + 1;
                    ni += child.ci.length;
                    for (var j = 0; j <= ni; j++) {
                        // Cut in universal node has j left, ni Total ie ni - j right
                        var cutUniversal = -Number.MAX_VALUE;
                        for (var x = 0; x <= node.size; x++) {
                            cutUniversal = Math.max(cutUniversal, x * (node.size - x) + x * j + (node.size - x) * (ni - j));
                        }

                        // Katevasma ston pinaka (Diladi right sto order)
                        if (A[i - 1][j].Value != null || j == 0) {
                            // Cut from this node
                            var cutNode = (ni - j - child.ci.length) * node.size;
                            var mc = -1 * Number.MAX_VALUE;
                            for (var x = 0; x < child.ci.length; x++) {
                                mc = Math.max(mc, child.ci[x] + (x + 1) * node.size);
                            }
                            cutNode += mc;
                            A[i][j].Value = Math.max(cutNode, cutUniversal, A[i - 1][j].Value);
                            A[i][j].Order = A[i - 1][j].Order.slice();
                        }

                        // + child size theseis deksia sto pinaka (Diladi Left sto order)
                        if ((j == child.ci.length) || ((j - child.ci.length) > 0 && A[i - 1][j - child.ci.length].Value != null)) {
                            // Cut from Node
                            var cutNode = (j - child.ci.length) * node.size;
                            var mc = -Number.MAX_VALUE;
                            for (var x = 0; x < child.ci.length; x++) {
                                mc = Math.max(mc, child.ci[x] + (x + 1) * node.size);
                            }
                            cutNode += mc;

                            if (A[i][j].Value != null) {
                                // here is tricky , we have a min order from
                                // previous case so clique goes right in order
                                // and nothing changes
                                // or this is minimum so clique goes left in order and we overwrite this cell
                                var cValue = Math.max(cutNode, cutUniversal, A[i - 1][j - child.ci.length].Value);
                                if (cValue <= A[i][j].Value) {
                                    A[i][j].Value = cValue;
                                    A[i][j].Order = A[i - 1][j - child.ci.length].Order.slice();
                                    A[i][j].Order.push(child);
                                }
                            } else {
                                // We see this cell for the first time so it goes right in order
                                A[i][j].Value = Math.max(cutNode, cutUniversal, A[i - 1][j - child.ci.length].Value);
                                A[i][j].Order = A[i - 1][j - child.ci.length].Order.slice();
                                A[i][j].Order.push(child);
                            }
                        }
                    }
                }
                // Done we have a minimum
                allMinimums = [];
                var minValue = Number.MAX_VALUE;
                for (var i = 0; i < A[A.length - 1].length; i++) {
                    if (A[A.length - 1][i].Value != null && A[A.length - 1][i].Value < minValue) {
                        allMinimums = [A[A.length - 1][i]];
                        minValue = A[A.length - 1][i].Value;
                    } else if (A[A.length - 1][i].Value != null && A[A.length - 1][i].Value == minValue) {
                        // we have a second minimum push it
                        allMinimums.push(A[A.length - 1][i])
                    }
                }

                // We now have many minima , we need to find the best one based on Cut + uLi
                for (var m = 0; m < allMinimums.length; m++) {
                    var minCW = allMinimums[m];

                    // Left Children are in minCW.Order
                    // Calculate the right Children
                    var rightChildren = [];
                    for (var i = 0; i < sortedChildren.length; i++) {
                        var found = false;
                        for (var j = 0; j < minCW.Order.length; j++) {
                            if (minCW.Order[j] === sortedChildren[i]) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            rightChildren.push(sortedChildren[i]);
                        }
                    }

                    // Save them for convenience
                    var left = minCW.Order;
                    var right = rightChildren;

                    // Now calculate the new cut's at each point of the order
                    var ci = [];
                    var leftcut = 0;
                    for (var i = 0; i < left.length; i++) {
                        for (var j = 0; j < left[i].ci.length; j++) {
                            // new cutwidth is the old cutwidth plus left*universal
                            ci.push(left[i].ci[j] + (j + 1 + leftcut) * node.size);
                        }
                        leftcut += left[i].ci.length;
                    }

                    //the universal cut
                    var rightcut = 0;
                    for (var i = 0; i < right.length; i++) {
                        rightcut += right[i].ci.length;
                    }
                    for (var i = 1; i <= node.size; i++) {
                        ci.push(i * (node.size - i) + i * rightcut + (node.size - i) * leftcut);
                    }

                    // now do the same for the right
                    // but reversed
                    rightcut = 0;
                    var rci = [];
                    for (var i = 0; i < right.length; i++) {
                        rci.push(rightcut * node.size);
                        for (var j = 0; j < right[i].ci.length - 1; j++) {
                            // new cutwidth is the old cutwidth plus the right*universal
                            rci.push(right[i].ci[j] + (j + 1 + rightcut) * node.size);
                        }
                        rightcut += right[i].ci.length;
                    }

                    rci.reverse();
                    Array.prototype.push.apply(ci, rci);

                    var uLi = Number.MAX_VALUE;
                    var uRi = Number.MAX_VALUE;
                    if (node.parent) {
                        uRi = 0 + node.parent.size * ci.length;
                        for (var i = 0; i < ci.length; i++) {
                            uLi = Math.min(uLi, ci[i] + (node.parent.size * (i + 1)));
                            if (i != ci.length - 1)
                                uRi = Math.min(uRi, ci[i] + (node.parent.size * (ci.length - i - 1)));
                        }
                    }

                    // check if this is minimum
                    if (m == 0 || uRi < node.fi) {
                        node.ci = ci;
                        node.left = left;
                        node.right = right;
                        node.fi = uRi;
                    }
                }

                // now we can calculate fi also
                //if (node.parent) {
                //    // We might need to reverse this tree
                //    var uLi = 0;
                //    var uRi = 0;
                //    for (var i = 0; i < node.ci.length; i++) {
                //        uLi = Math.max(uLi, node.ci[i] + (node.parent.size * (i + 1)));
                //        uRi = Math.max(uRi, node.ci[i] + (node.parent.size * (node.ci.length - i - 1)));
                //    }

                //    if (uRi < uLi) {
                //        // Reverse of this order is better, we have to reverse it
                //        var tmp = node.left;
                //        node.left = node.right;
                //        node.right = tmp;

                //        tmp = node.ci.pop();
                //        node.ci.reverse();
                //        node.ci.push(tmp);
                //    }

                //    node.fi = -Number.MAX_VALUE;
                //    for (var i = 0; i < node.ci.length; i++) {
                //        node.fi = Math.max(node.fi, node.ci[i] - (node.parent.size * (node.ci.length - i - 1)));
                //    }
                //}
            }
        }
    }

    /*
     * Threshold Ordering 
     * based on paper http://www.cs.uoi.gr/~charis/files/cutwidth-journal.pdf
     */
    this.ThesholdOrder = function() {
        // Generate the simple graph from compact tree representation
        var simpleNodes = [];
        var simpleLinks = [];
        for (var i = 0; i < this.nodes.length; i++) {
            for (var s = 0; s < this.nodes[i].size; s++) {
                simpleNodes.push({ rank: 0, deg: 0, node: this.nodes[i] });

                // add links to all previous vertices in this clique
                for (var j = 0; j < s; j++) {
                    simpleLinks.push({ source: simpleNodes[simpleNodes.length - 1], target: simpleNodes[simpleNodes.length - 2 - j], order: simpleLinks.length });
                }

                // add links to all previous cliques
                for (var j = 0; j < simpleNodes.length; j++) {
                    for (var k = 0; k < this.links.length; k++) {
                        if (this.links[k].source == simpleNodes[j].node && this.links[k].target == this.nodes[i]) {
                            simpleLinks.push({ source: simpleNodes[j], target: simpleNodes[simpleNodes.length - 1] });
                        } else if (this.links[k].target == simpleNodes[j].node && this.links[k].source == this.nodes[i]) {
                            simpleLinks.push({ target: simpleNodes[j], source: simpleNodes[simpleNodes.length - 1] });
                        }
                    }
                }
            }
        }

        // Calculate ranks and degrees of each vertex
        for (var i = 0; i < simpleLinks.length; i++) {
            simpleLinks[i].source.rank += 1;
            simpleLinks[i].target.rank += 1;

            simpleLinks[i].source.deg += 1;
            simpleLinks[i].target.deg += 1;
        }

        var nodes = simpleNodes.slice();
        nodes.sort(function(a, b) { return a.order - b.order });

        // run the algorithm
        var n = nodes.length;
        for (var i = 0; i < n; i++) {
            var ui = 0;
            for (var j = 0; j < nodes.length; j++) {
                if (nodes[j].rank < nodes[ui].rank) {
                    ui = j;
                } else if (nodes[j].rank == nodes[ui].rank && (nodes[j].deg > nodes[ui].deg)) {
                    ui = j;
                }
            }

            nodes[ui].order = i;
            for (var k = 0; k < simpleLinks.length; k++) {
                if (simpleLinks[k].source == nodes[ui]) {
                    simpleLinks[k].target.rank -= 2;
                } else if (simpleLinks[k].target == nodes[ui]) {
                    simpleLinks[k].source.rank -= 2;
                }
            }
            nodes.splice(ui, 1);
        }

        // Go back to compact tree representation using Lemma 3.3 () by gathering each vertex to the middle one of
        // each clique
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].order = -1;
            this.nodes[i].HaveSeenMiddleVertex = 0;
        }

        simpleNodes.sort(function(a, b) { return a.order - b.order });
        var order = 0;
        for (var i = 0; i < simpleNodes.length; i++) {
            if (simpleNodes[i].node.size == 1) {
                simpleNodes[i].node.order = order;
                order++;
            } else if (simpleNodes[i].node.HaveSeenMiddleVertex < Math.floor(simpleNodes[i].node.size / 2)) {
                // we need to find the middle one
                simpleNodes[i].node.HaveSeenMiddleVertex++;
                if (simpleNodes[i].node.HaveSeenMiddleVertex == Math.floor(simpleNodes[i].node.size / 2)) {
                    simpleNodes[i].node.order = order;
                    order++;
                }
            }
        }

        this.updateAll();
    }

    /*
     * Recursivly arrange all from polynomyal 1-lvl algorithm
     */
    this.ArrangeAll = function() {
        n = this.root;
        if (Array.isArray(gTree.root)) {
            n = gTree.root[0];
        }

        var count = 0;

        function dfs(node, isRight) {
            if (node != null) {
                var thisleft = node.left ? node.left : node.children;
                var thisright = node.right ? node.right : null;

                if (isRight) {
                    var tmp = thisright;
                    thisright = thisleft;
                    thisleft = tmp;
                }

                // fix the left
                if (thisleft != null) {
                    for (var i = 0; i < thisleft.length; i++) {
                        dfs(thisleft[i], false);
                    }
                }

                // fix this
                node.order = count;
                count++;

                // fix right children
                if (thisright != null && thisright.length > 0) {
                    for (var i = thisright.length - 1; i >= 0; i--) {
                        dfs(thisright[i], true);
                    }
                }
            }
        }

        dfs(n, false);
    }

    this.calculateNeighbours = function(root) {
        /// Calculate neighbourhoods
        // TODO: fix root 
        if (Array.isArray(root)) {
            root = root[0];
        }

        var s = root;

        function ndfs(nnode) {
            nnode.neighbourhood = 0;
            if (nnode.children && nnode.children.length > 0) {
                for (var i = 0; i < nnode.children.length; i++) {
                    ndfs(nnode.children[i]);
                    nnode.neighbourhood += nnode.children[i].neighbourhood + nnode.children[i].size;
                }
            } else {
                nnode.neighbourhood = 0;
            }
        }
        ndfs(root);
    }

    /*
     * Calculate best cutwidth using the Dynamic Algorithm
     */
    this.DynamicCutWidth = function(g) {
        var min = DynamicAlgorithm.DynamicCutWidth(g, DynamicAlgorithm.fCutWidth);

        g.minimumCutwidth = min.Value;
        this.updateAll();
    }

    this.uuid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}