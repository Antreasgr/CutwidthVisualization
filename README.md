# CutwidthVisualization
Graph Theory - A visualization tool for the cutwidth problem on graphs

# Graph Input
* Accept input input in json format(see .json examples). 
* Graphs must be tree representation of quasi-threshold(or theshold).
* If minimum cutwidth is known it can be put in json in the "minimumCutwidth" field.
* Supports pre-saved linear orderings in "order" field.

# Usage
* You can interact with the graph, move around nodes ,add/remove nodes or adjust their sizes by will.
* Cutwidth for the current linear order is shown.
* Use the help button for more information on how to use

# Installation
All functionality is inline in one file so this can be loaded locally in browser without the use of a server.
The simple version is colorfull, but there is the modified-colors version which is black and white for use in screenshots etc.

# Command Help
You can execute 3 known algorithms for the graphs.
An optimal dynamic programming algorithm in exponential time, an non-optimal polynomial time algorithm, and an optimal algorithm for threshold graphs

* <kbd>Click</kbd> on a node in the tree to add a new child.
* <kbd>Alt + Click</kbd> on a node in the tree to remove it and it's children.
* <kbd>Mouseover</kbd> on a node and press <kbd>+</kbd> or <kbd>-</kbd> to adjust its size
* <kbd>Shift + ,</kbd> or <kbd>Shift + .</kbd> to move to the next/previous order saved in input file.
* <kbd>Mouseover</kbd> on a node and press <kbd>o</kbd> to find an order for that node and its children using the bitonic algorithm as proposed by us. <kbd>Non optimal</kbd> for every graph except 1-level quasi-threshold
* Press <kbd>Shift + D</kbd> to find a linear ordering using the <i>Dynamic Programming</i> algorithm as proposed by <a href="http://users.uoa.gr/~sedthilk/papers/notexact.pdf">A Note on Exact Algorithms for Vertex Ordering Problems on Graphs</a> in <kbd>O(2<sup>N</sup>)</kbd> time and space. <code class="code-green">Optimal</kbd> for every graph
* Press <kbd>Shift + T</kbd> to find a linear ordering using the using the <i>Threshold Algorithm</i> for threshold graphs as proposed by <a href="http://www.cs.uoi.gr/~charis/files/cutwidth-journal.pdf">Cutwidth of split graphs and threshold graphs</a> in <code class="code-green">O(n)</kbd> time. <code class="code-green">Optimal</kbd> only for threshold graph
* <kbd>~</kbd> to open up debug information. Then <kbd>Mouseover</kbd> a node to see it's specified debug info.

 
