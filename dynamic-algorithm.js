//Adding new Functionality to the skillet
(function(DynamicAlgorithm) {

    /**
     * Functions for dynamic programming algorithm according to
     * [A Note on exact Algorithms for Vertex Ordering 2011]
     * http://users.uoa.gr/~sedthilk/papers/notexact.pdf
     * The function returning the cutwidth of a specific order
     **/
    DynamicAlgorithm.fCutWidth = function(S, v, links) {
        var newS = new Set(S);
        var iS = new Set(S);
        newS.add(v);
        var cut = 0;
        var left = 0,
            right = 0;
        for (var i = 0; i < links.length; i++) {
            if ((iS.has(links[i].source) && !newS.has(links[i].target)) ||
                (!newS.has(links[i].source) && iS.has(links[i].target))) {

                cut += links[i].source.size * links[i].target.size;
            }

            if (links[i].source == v) {
                if (iS.has(links[i].target)) {
                    left += links[i].target.size;
                } else {
                    right += links[i].target.size;
                }
            } else if (links[i].target == v) {
                if (iS.has(links[i].source)) {
                    left += links[i].source.size;
                } else {
                    right += links[i].source.size;
                }
            }
        }

        var insideCut = 0;
        for (var i = 0; i <= v.size; i++) {
            insideCut = Math.max(insideCut, -(i * i) + i * (v.size + right - left) + v.size * left);
        }

        return cut + insideCut;
    }

    DynamicAlgorithm.DynamicCutWidth = function(graph, cutwidth_fn) {
        $(".well.debug").slideToggle();
        $(".well.debug div").html("Running Dynamic Algorithm please wait.....<ul></ul>");
        var A = {};
        var nodes = graph.nodes;
        for (var i = 1; i <= nodes.length; i++) {
            var comb = k_combinations(nodes, i);
            var s = `<li>Step: ${i} Size of A: ${Object.keys(A).length}, Number of combinations: ${comb.length}</li>`;
            $(".well.debug div ul").append(s);

            for (var j = 0; j < comb.length; j++) {
                var minW = { Value: Number.MAX_VALUE, Order: [] };
                for (var w = 0; w < comb[j].length; w++) {
                    // build the S \ {w}
                    var smw = new Array();
                    for (var k = 0; k < comb[j].length; k++) {
                        if (k != w) {
                            smw.push(comb[j][k]);
                        }
                    }

                    var hashp = hashArray(smw);
                    var f = Math.max(cutwidth_fn(smw, comb[j][w], graph.links), (A[hashp]) ? A[hashp].Value : 0);
                    if (f < minW.Value) {
                        minW.Value = f;
                        if (A[hashp]) {
                            minW.Order = A[hashp].Order.slice();
                            minW.Order.push(comb[j][w]);
                        } else {
                            minW.Order = [comb[j][w]];
                        }
                    }
                }

                A[hashArray(comb[j])] = minW;
            }
        }

        $(".well.debug div").append("Done, minimum cutwidth: " + A[hashArray(nodes)].Value);

        for (var i = 0; i < A[hashArray(nodes)].Order.length; i++) {
            A[hashArray(nodes)].Order[i].order = i;
        }

        return A[hashArray(nodes)];
    }

    //Helper function to hash a set of vertices
    var hashArray = function(a) {
        if (!(a instanceof Array))
            return '';

        var copy = a.slice();

        copy.sort(function(a, b) {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });

        var hash = '';
        for (var i = 0; i < copy.length; i++) {
            hash += copy[i].name + ",";
        }

        return hash;
    }

    /**
     * K-combinations
     *
     * Get k-sized combinations of elements in a set.
     *
     * Usage:
     *   k_combinations(set, k)
     *
     * Parameters:
     *   set: Array of objects of any type. They are treated as unique.
     *   k: size of combinations to search for.
     *
     * Return:
     *   Array of found combinations, size of a combination is k.
     *
     * Examples:
     *
     *   k_combinations([1, 2, 3], 1)
     *   -> [[1], [2], [3]]
     *
     *   k_combinations([1, 2, 3], 2)
     *   -> [[1,2], [1,3], [2, 3]
     *
     *   k_combinations([1, 2, 3], 3)
     *   -> [[1, 2, 3]]
     *
     *   k_combinations([1, 2, 3], 4)
     *   -> []
     *
     *   k_combinations([1, 2, 3], 0)
     *   -> []
     *
     *   k_combinations([1, 2, 3], -1)
     *   -> []
     *
     *   k_combinations([], 0)
     *   -> []
     */
    var k_combinations = function(set, k) {
        var i, j, combs, head, tailcombs;

        if (k > set.length || k <= 0) {
            return [];
        }

        if (k == set.length) {
            return [set];
        }

        if (k == 1) {
            combs = [];
            for (i = 0; i < set.length; i++) {
                combs.push([set[i]]);
            }
            return combs;
        }

        combs = [];
        for (i = 0; i < set.length - k + 1; i++) {
            head = set.slice(i, i + 1);
            tailcombs = k_combinations(set.slice(i + 1), k - 1);
            for (j = 0; j < tailcombs.length; j++) {
                combs.push(head.concat(tailcombs[j]));
            }
        }
        return combs;
    }

}(window.DynamicAlgorithm = window.DynamicAlgorithm || {}));