(function (){
    im3 = {
        version: "1.0.0",
        dev:false
    };
    im3.canvas=[];


    im3.tooltip={};//提示框以及内容
    im3.utils = {}; //系统中需要的一些工具
    im3.models = {};//显示内容
    im3.graphs = []; //存放页面中所有的数据
    im3.logs = {}; //日志
    im3.dispatch = d3.dispatch('render_start', 'render_end');

    if (im3.dev) {
        //开发模式会有日志暑促
        im3.dispatch.on('render_start', function(e) {
            im3.logs.startTime = +new Date();
        });

        im3.dispatch.on('render_end', function(e) {
            im3.logs.endTime = +new Date();
            im3.logs.totalTime = im3.logs.endTime - im3.logs.startTime;
            im3.log('total', im3.logs.totalTime); //记录时间
        });
    }

    // Logs all arguments, and returns the last so you can test things in place
    im3.log = function() {
        if (im3.dev && console.log) console.log.apply(console, arguments);
        return arguments[arguments.length - 1];
    };

    im3.render = function render(step) {
        step = step || 1; // number of graphs to generate in each timout loop

        render.active = true;
        im3.dispatch.render_start();

        setTimeout(function() {
            var chart;

            for (var i = 0; i < step && (graph = render.queue[i]); i++) {
                chart = graph.generate();
                if (typeof graph.callback == typeof(Function)) graph.callback(chart);
                im3.graphs.push(chart);
            }

            render.queue.splice(0, i);

            if (render.queue.length) setTimeout(arguments.callee, 0);
            else { im3.render.active = false; im3.dispatch.render_end(); }
        }, 0);
    };

    im3.render.queue = [];
    /***
     * 添加一个图形
     * @param obj
     */
    im3.addGraph = function(obj) {
          if (typeof arguments[0] === typeof(Function))
            obj = {generate: arguments[0], callback: arguments[1]};

        im3.render.queue.push(obj);

        if (!im3.render.active) im3.render();
    };






    /*****
     * 提示信息用来显示值或其他内容.
     *****/
    (function() {

        var imtooltip = window.im3.tooltip = {};

        imtooltip.show = function(pos, content, gravity, dist, parentContainer, classes) {
           // d3.mouse("body")
            var container = document.createElement('div');
            container.className = 'imtooltip ' + (classes ? classes : 'xy-tooltip');

            gravity = gravity || 's';
            dist = dist || 20;

            var body = parentContainer ? parentContainer : document.getElementsByTagName('body')[0];

            container.innerHTML = content;
            container.style.left = 0;
            container.style.top = 0;
            container.style.opacity = 0;

            body.appendChild(container);

            var height = parseInt(container.offsetHeight),
                width = parseInt(container.offsetWidth),
                windowWidth = im3.utils.windowSize().width,
                windowHeight = im3.utils.windowSize().height,
                scrollTop = document.documentElement.scrollTop,
                scrollLeft = document.documentElement.scrollLeft,
                left, top;

            switch (gravity) {
                case 'e':
                    left = pos[0] - width - dist;
                    top = pos[1] - (height / 2);
                    if (left < scrollLeft) left = pos[0] + dist;
                    if (top < scrollTop) top = scrollTop + 5;
                    if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
                    break;
                case 'w':
                    left = pos[0] + dist;
                    top = pos[1] - (height / 2);
                    if (left + width > windowWidth) left = pos[0] - width - dist;
                    if (top < scrollTop) top = scrollTop + 5;
                    if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5;
                    break;
                case 'n':
                    left = pos[0] - (width / 2);
                    top = pos[1] + dist;
                    if (left < scrollLeft) left = scrollLeft + 5;
                    if (left + width > windowWidth) left = windowWidth - width - 5;
                    if (top + height > scrollTop + windowHeight) top = pos[1] - height - dist;
                    break;
                case 's':
                    left = pos[0] - (width / 2);
                    top = pos[1] - height - dist+scrollTop;
                    if (left < scrollLeft) left = scrollLeft + 5;
                    if (left + width > windowWidth) left = windowWidth - width - 5;
                    //if (scrollTop > top) top = pos[1] + 20;
                    break;
            }


            container.style.left = left+'px';
            container.style.top = top+'px';
            container.style.opacity = 1;
            container.style.position = 'absolute'; //fix scroll bar issue
            //container.style.pointerEvents = 'none'; //fix scroll bar issue

            return container;
        };

        imtooltip.cleanup = function() {

            // Find the tooltips, mark them for removal by this class (so others cleanups won't find it)
            var tooltips = document.getElementsByClassName('imtooltip');
            var purging = [];
            while(tooltips.length) {
                purging.push(tooltips[0]);
                tooltips[0].style.transitionDelay = '0 !important';
                tooltips[0].style.opacity = 0;
                tooltips[0].className = 'imtooltip-pending-removal';
            }


            setTimeout(function() {

                while (purging.length) {
                    var removeMe = purging.pop();
                    removeMe.parentNode.removeChild(removeMe);
                }
            }, 500);
        };


    })();

    im3.utils.windowSize = function() {
        // 设置默认项
        var size = {width: 640, height: 480};
        // 早起IE使用该项
        if (document.body && document.body.offsetWidth) {
            size.width = document.body.offsetWidth;
            size.height = document.body.offsetHeight;
        }

        // IE can use depending on mode it is in
        if (document.compatMode=='CSS1Compat' &&
            document.documentElement &&
            document.documentElement.offsetWidth ) {
            size.width = document.documentElement.offsetWidth;
            size.height = document.documentElement.offsetHeight;
        }

        // Most recent browsers use
        if (window.innerWidth && window.innerHeight) {
            size.width = window.innerWidth;
            size.height = window.innerHeight;
        }
        return (size);
    };

    im3.utils.getColor = function(color) {
        if (!arguments.length) return im3.utils.defaultColor(); //if you pass in nothing, get default colors back

        if( Object.prototype.toString.call( color ) === '[object Array]' )
            return function(d, i) { return d.color || color[i % color.length]; };
        else
            return color;
        //can't really help it if someone passes rubish as color
    }

// Default color chooser uses the index of an object as before.
    im3.utils.defaultColor = function() {
        var colors = d3.scale.category20().range();
        return function(d, i) { return d.color || colors[i % colors.length] };
    }

    im3.utils.windowResize = function(fun){
        var oldresize = window.onresize;

        window.onresize = function(e) {
            if (typeof oldresize == 'function') oldresize(e);
            fun(e);
        }
    }



    /*******
     * 传统饼状图
     */
    im3.models.pie = function() {

        //============================================================
        // 通用设置
        //------------------------------------------------------------

        var margin = {top: 0, right: 0, bottom: 0, left: 0}
            , width = 500//设置宽度
            , height = 500//设置高度
            , getValues = function(d) { return d.values }//设置得到的值
            , getX = function(d) { return d.x }
            , getY = function(d) { return d.y }
            , id = Math.floor(Math.random() * 10000) //创建随机id防止用户没有选择到对应文件
            , color = im3.utils.defaultColor()//获得默认颜色
            , valueFormat = d3.format(',.2f')//数字格式
            , showLabels = true//是否显示标签
            , donutLabelsOutside = false//途中的文字是否显示在外侧
            , labelThreshold = .02 //if slice percentage is under this, don't show label
            , donut = false//true表示空心病状图，false表示传统病状图。
            , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')//时间内容
            ;

        //============================================================

        /**
         * 构造函数
         * @param selection //通过d3进行绑定数据
         * @return {Function}
         */
        function chart(selection) {
            selection.each(function(data) {
                //对数据进行循环并创建相应图像
                var availableWidth = width - margin.left - margin.right,
                    availableHeight = height - margin.top - margin.bottom,
                    radius = Math.min(availableWidth, availableHeight) / 2,//获得直径
                    container = d3.select(this);//得到当前的svg


                //------------------------------------------------------------
                // 创建对应图形的框架

                var wrap = container.selectAll('.im-wrap.im-pie').data([getValues(data[0])]);//创建一个p节点
                var wrapEnter = wrap.enter().append('g').attr('class','im3 im-wrap im-pie im-chart-' + id);
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-pie');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                g.select('.im-pie').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

                //------------------------------------------------------------


                container
                    .on('click', function(d,i) {
                    dispatch.chartClick({
                        data: d,
                        index: i,
                        pos: d3.event,
                        id: id
                    });
                });


                var arc = d3.svg.arc()
                    .outerRadius((radius-(radius / 5)));

                if (donut) arc.innerRadius(radius / 2);


                // Setup the Pie chart and choose the data element
                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) { return d.disabled ? 0 : getY(d) });

                var slices = wrap.select('.im-pie').selectAll('.im-slice')
                    .data(pie);

                slices.exit().remove();

                var ae = slices.enter().append('g')
                    .attr('class', 'im-slice')
                    .on('mouseover', function(d,i){
                        d3.select(this).classed('hover', true);
                        dispatch.elementMouseover({
                            label: getX(d.data),
                            value: getY(d.data),
                            point: d.data,
                            pointIndex: i,
                            pos: [d3.event.pageX, d3.event.pageY],
                            id: id
                        });
                    })
                    .on('mouseout', function(d,i){
                        d3.select(this).classed('hover', false);
                        dispatch.elementMouseout({
                            label: getX(d.data),
                            value: getY(d.data),
                            point: d.data,
                            index: i,
                            id: id
                        });
                    })
                    .on('click', function(d,i) {
                        dispatch.elementClick({
                            label: getX(d.data),
                            value: getY(d.data),
                            point: d.data,
                            index: i,
                            pos: d3.event,
                            id: id
                        });
                        d3.event.stopPropagation();
                    })
                    .on('dblclick', function(d,i) {
                        dispatch.elementDblClick({
                            label: getX(d.data),
                            value: getY(d.data),
                            point: d.data,
                            index: i,
                            pos: d3.event,
                            id: id
                        });
                        d3.event.stopPropagation();
                    });

                slices
                    .attr('fill', function(d,i) { return color(d, i); })
                    .attr('stroke', function(d,i) { return color(d, i); });

                var paths = ae.append('path')
                    .each(function(d) { this._current = d; })
                //.attr('d', arc);

                d3.transition(slices.select('path'))
                    .attr('d', arc)
                    .attrTween('d', arcTween);

                if (showLabels) {
                    // This does the normal label
                    var labelsArc = arc;
                    if (donutLabelsOutside) {
                        labelsArc = d3.svg.arc().outerRadius(arc.outerRadius())
                    }

                    ae.append("g").classed("im-label", true)
                        .each(function(d, i) {
                            var group = d3.select(this);

                            group
                                .attr('transform', function(d) {

                                d.outerRadius = radius + 10; // Set Outer Coordinate
                                d.innerRadius = radius + 15; // Set Inner Coordinate
                                return 'translate(' + labelsArc.centroid(d) + ')'
                            });

                            group.append('rect')
                                .style('stroke', '#fff')
                                .style('fill', '#fff')
                                .attr("rx", 3)
                                .attr("ry", 3);

                            group.append('text')
                                .style('text-anchor', 'middle') //center the text on it's origin
                                .style('fill', '#000')


                        });

                    slices.select(".im-label").transition()
                        .attr('transform', function(d) {
                            d.outerRadius = radius + 10; // Set Outer Coordinate
                            d.innerRadius = radius + 15; // Set Inner Coordinate
                            return 'translate(' + labelsArc.centroid(d) + ')';
                        });

                    slices.each(function(d, i) {
                        var slice = d3.select(this);

                        slice
                            .select(".im-label text")
                            .text(function(d, i) {
                                var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
                                return (d.value && percent > labelThreshold) ? getX(d.data) : '';
                            });

                        var textBox = slice.select('text').node().getBBox();
                        slice.select(".im-label rect")
                            .attr("width", textBox.width + 10)
                            .attr("height", textBox.height + 10)
                            .attr("transform", function() {
                                return "translate(" + [textBox.x - 5, textBox.y - 5] + ")";
                            });
                    });
                }


                // Computes the angle of an arc, converting from radians to degrees.
                function angle(d) {
                    var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
                    return a > 90 ? a - 180 : a;
                }

                function arcTween(a) {
                    if (!donut) a.innerRadius = 0;
                    var i = d3.interpolate(this._current, a);
                    this._current = i(0);
                    return function(t) {
                        return arc(i(t));
                    };
                }

                function tweenPie(b) {
                    b.innerRadius = 0;
                    var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
                    return function(t) {
                        return arc(i(t));
                    };
                }

            });

            return chart;
        }


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        chart.dispatch = dispatch;

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.values = function(_) {
            if (!arguments.length) return getValues;
            getValues = _;
            return chart;
        };

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = _;
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = d3.functor(_);
            return chart;
        };

        chart.showLabels = function(_) {
            if (!arguments.length) return showLabels;
            showLabels = _;
            return chart;
        };

        chart.donutLabelsOutside = function(_) {
            if (!arguments.length) return donutLabelsOutside;
            donutLabelsOutside = _;
            return chart;
        };

        chart.donut = function(_) {
            if (!arguments.length) return donut;
            donut = _;
            return chart;
        };

        chart.id = function(_) {
            if (!arguments.length) return id;
            id = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            return chart;
        };

        chart.valueFormat = function(_) {
            if (!arguments.length) return valueFormat;
            valueFormat = _;
            return chart;
        };

        chart.labelThreshold = function(_) {
            if (!arguments.length) return labelThreshold;
            labelThreshold = _;
            return chart;
        };

        //============================================================


        return chart;
    };



    /*******
     * 饼状图模式
     */

    im3.models.pieChart = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var pie = im3.models.pie()
            , legend = im3.models.legend()
            ;

        var margin = {top: 30, right: 20, bottom: 20, left: 20}
            , width = null
            , height = null
            , showLegend = true
            , color = im3.utils.defaultColor()
            , tooltips = true
            , tooltip = function(key, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + '</p>'
            }
            , noData = noDataMessage()
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
            ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
            var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
                top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
                y = pie.valueFormat()(pie.y()(e.point)),
                content = tooltip(pie.x()(e.point), y, e, chart);

            im3.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
        };

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { chart(selection); };
                chart.container = this;


                //------------------------------------------------------------
                // Display No Data message if there's nothing to show.

                if (!data || !data.length) {
                    var noDataText = container.selectAll('.im-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'im3 im-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.im-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-pieChart').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-pieChart').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-pieWrap');
                gEnter.append('g').attr('class', 'im-legendWrap');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend
                        .width( availableWidth )
                        .key(pie.x());

                    wrap.select('.im-legendWrap')
                        .datum(pie.values()(data[0]))
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                            - margin.top - margin.bottom;
                    }

                    wrap.select('.im-legendWrap')
                        .attr('transform', 'translate(0,' + (-margin.top) +')');
                }

                //------------------------------------------------------------


                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                //------------------------------------------------------------
                // Main Chart Component(s)

                pie
                    .width(availableWidth)
                    .height(availableHeight);


                var pieWrap = g.select('.im-pieWrap')
                    .datum(data);

                d3.transition(pieWrap).call(pie);

                //------------------------------------------------------------


                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('legendClick', function(d,i, that) {
                    d.disabled = !d.disabled;

                    if (!pie.values()(data[0]).filter(function(d) { return !d.disabled }).length) {
                        pie.values()(data[0]).map(function(d) {
                            d.disabled = false;
                            wrap.selectAll('.im-series').classed('disabled', false);
                            return d;
                        });
                    }

                    selection.transition().call(chart)
                });

                pie.dispatch.on('elementMouseout.tooltip', function(e) {
                    dispatch.tooltipHide(e);
                });

                //============================================================


            });

            return chart;
        }

        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        pie.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        dispatch.on('tooltipShow', function(e) {
            if (tooltips) showTooltip(e);
        });

        dispatch.on('tooltipHide', function() {
            if (tooltips) im3.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.pie = pie;

        d3.rebind(chart, pie, 'valueFormat', 'values', 'x', 'y', 'id', 'showLabels', 'donutLabelsOutside', 'donut', 'labelThreshold');

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            legend.color(color);
            pie.color(color);
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        //============================================================


        return chart;
    };

    /**
     * 坐标轴
     * @type {*}
     */
    im3.models.axis = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin = {top: 0, right: 0, bottom: 0, left: 0}
            , width = 60 //only used for tickLabel currently
            , height = 60 //only used for tickLabel currently
            , scale = d3.scale.linear()
            , axisLabelText = null
            , showMaxMin = true //TODO: showMaxMin should be disabled on all ordinal scaled axes
            , highlightZero = true
            , rotateLabels = 0
            , rotateYLabel = true
            , ticks = null
            ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var axis = d3.svg.axis()
                .scale(scale)
                .orient('bottom')
                .tickFormat(function(d) { return d }) //TODO: decide if we want to keep this
            , scale0;

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-axis').data([data]);
                var wrapEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-axis');
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g')

                //------------------------------------------------------------

                if (ticks !== null)

                    axis.ticks(ticks);
                else if (axis.orient() == 'top' || axis.orient() == 'bottom')
                    axis.ticks(Math.abs(scale.range()[1] - scale.range()[0]) / 100);


                //TODO: consider calculating width/height based on whether or not label is added, for reference in charts using this component


                d3.transition(g)
                    .call(axis);

                scale0 = scale0 || axis.scale();

                var axisLabel = g.selectAll('text.im-axislabel')
                    .data([axisLabelText || null]);
                axisLabel.exit().remove();
                switch (axis.orient()) {
                    case 'top':
                        axisLabel.enter().append('text').attr('class', 'im-axislabel')
                            .attr('text-anchor', 'middle')
                            .attr('y', 0);
                        var w = (scale.range().length==2) ? scale.range()[1] : (scale.range()[scale.range().length-1]+(scale.range()[1]-scale.range()[0]));
                        axisLabel
                            .attr('x', w/2);
                        if (showMaxMin) {
                            var axisMaxMin = wrap.selectAll('g.im-axisMaxMin')
                                .data(scale.domain());
                            axisMaxMin.enter().append('g').attr('class', 'im-axisMaxMin').append('text');
                            axisMaxMin.exit().remove();
                            axisMaxMin
                                .attr('transform', function(d,i) {
                                return 'translate(' + scale(d) + ',0)'
                            })
                                .select('text')
                                .attr('dy', '0em')
                                .attr('y', -axis.tickPadding())
                                .attr('text-anchor', 'middle')
                                .text(function(d,i) {
                                    return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                                });
                            d3.transition(axisMaxMin)
                                .attr('transform', function(d,i) {
                                    return 'translate(' + scale.range()[i] + ',0)'
                                });
                        }
                        break;
                    case 'bottom':
                        var xLabelMargin = 30;
                        var maxTextWidth = 30;
                        if(rotateLabels%360){
                            var xTicks = g.selectAll('g').select("text");
                            //Calculate the longest xTick width
                            xTicks.each(function(d,i){
                                var width = this.getBBox().width;
                                if(width > maxTextWidth) maxTextWidth = width;
                            });
                            //Convert to radians before calculating sin. Add 30 to margin for healthy padding.
                            var sin = Math.abs(Math.sin(rotateLabels*Math.PI/180));
                            var xLabelMargin = (sin ? sin*maxTextWidth : maxTextWidth)+30;
                            //Rotate all xTicks
                            xTicks.attr('transform', function(d,i,j) { return 'rotate(' + rotateLabels + ' 0,0)' })
                                .attr('text-anchor', rotateLabels%360 > 0 ? 'start' : 'end');
                        }
                        axisLabel.enter().append('text').attr('class', 'im-axislabel')
                            .attr('text-anchor', 'middle')
                            .attr('y', xLabelMargin);
                        var w = (scale.range().length==2) ? scale.range()[1] : (scale.range()[scale.range().length-1]+(scale.range()[1]-scale.range()[0]));
                        axisLabel
                            .attr('x', w/2);
                        if (showMaxMin) {
                            var axisMaxMin = wrap.selectAll('g.im-axisMaxMin')
                                .data(scale.domain());
                            axisMaxMin.enter().append('g').attr('class', 'im-axisMaxMin').append('text');
                            axisMaxMin.exit().remove();
                            axisMaxMin
                                .attr('transform', function(d,i) {
                                return 'translate(' + scale(d) + ',0)'
                            })
                                .select('text')
                                .attr('dy', '.71em')
                                .attr('y', axis.tickPadding())
                                .attr('transform', function(d,i,j) { return 'rotate(' + rotateLabels + ' 0,0)' })
                                .attr('text-anchor', rotateLabels%360 > 0 ? 'start' : 'end')
                                .text(function(d,i) {
                                    return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                                });
                            d3.transition(axisMaxMin)
                                .attr('transform', function(d,i) {
                                    return 'translate(' + scale.range()[i] + ',0)'
                                });
                        }
                        break;
                    case 'right':
                        axisLabel.enter().append('text').attr('class', 'im-axislabel')
                            .attr('text-anchor', rotateYLabel ? 'middle' : 'begin')
                            .attr('transform', rotateYLabel ? 'rotate(90)' : '')
                            .attr('y', rotateYLabel ? (-Math.max(margin.right,width) - 12) : -10); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
                        axisLabel
                            .attr('x', rotateYLabel ? (scale.range()[0] / 2) : axis.tickPadding());
                        if (showMaxMin) {
                            var axisMaxMin = wrap.selectAll('g.im-axisMaxMin')
                                .data(scale.domain());
                            axisMaxMin.enter().append('g').attr('class', 'im-axisMaxMin').append('text')
                                .style('opacity', 0);
                            axisMaxMin.exit().remove();
                            axisMaxMin
                                .attr('transform', function(d,i) {
                                return 'translate(0,' + scale(d) + ')'
                            })
                                .select('text')
                                .attr('dy', '.32em')
                                .attr('y', 0)
                                .attr('x', axis.tickPadding())
                                .attr('text-anchor', 'start')
                                .text(function(d,i) {
                                    return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                                });
                            d3.transition(axisMaxMin)
                                .attr('transform', function(d,i) {
                                    return 'translate(0,' + scale.range()[i] + ')'
                                })
                                .select('text')
                                .style('opacity', 1);
                        }
                        break;
                    case 'left':
                        axisLabel.enter().append('text').attr('class', 'im-axislabel')
                            .attr('text-anchor', rotateYLabel ? 'middle' : 'end')
                            .attr('transform', rotateYLabel ? 'rotate(-90)' : '')
                            .attr('y', rotateYLabel ? (-Math.max(margin.left,width) + 12) : -10); //TODO: consider calculating this based on largest tick width... OR at least expose this on chart
                        axisLabel
                            .attr('x', rotateYLabel ? (-scale.range()[0] / 2) : -axis.tickPadding());
                        if (showMaxMin) {
                            var axisMaxMin = wrap.selectAll('g.im-axisMaxMin')
                                .data(scale.domain());
                            axisMaxMin.enter().append('g').attr('class', 'im-axisMaxMin').append('text')
                                .style('opacity', 0);
                            axisMaxMin.exit().remove();
                            axisMaxMin
                                .attr('transform', function(d,i) {
                                return 'translate(0,' + scale0(d) + ')'
                            })
                                .select('text')
                                .attr('dy', '.32em')
                                .attr('y', 0)
                                .attr('x', -axis.tickPadding())
                                .attr('text-anchor', 'end')
                                .text(function(d,i) {
                                    return ('' + axis.tickFormat()(d)).match('NaN') ? '' : axis.tickFormat()(d)
                                });
                            d3.transition(axisMaxMin)
                                .attr('transform', function(d,i) {
                                    return 'translate(0,' + scale.range()[i] + ')'
                                })
                                .select('text')
                                .style('opacity', 1);
                        }
                        break;
                }
                axisLabel
                    .text(function(d) { return d });


                //check if max and min overlap other values, if so, hide the values that overlap
                if (showMaxMin && (axis.orient() === 'left' || axis.orient() === 'right')) {
                    g.selectAll('g') // the g's wrapping each tick
                        .each(function(d,i) {
                            if (scale(d) < scale.range()[1] + 10 || scale(d) > scale.range()[0] - 10) { // 10 is assuming text height is 16... if d is 0, leave it!
                                if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                                    d3.select(this).remove();
                                else
                                    d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
                            }
                        });
                }

                if (showMaxMin && (axis.orient() === 'top' || axis.orient() === 'bottom')) {
                    var maxMinRange = [];
                    wrap.selectAll('g.im-axisMaxMin')
                        .each(function(d,i) {
                            if (i) // i== 1, max position
                                maxMinRange.push(scale(d) - this.getBBox().width - 4)  //assuming the max and min labels are as wide as the next tick (with an extra 4 pixels just in case)
                            else // i==0, min position
                                maxMinRange.push(scale(d) + this.getBBox().width + 4)
                        });
                    g.selectAll('g') // the g's wrapping each tick
                        .each(function(d,i) {
                            if (scale(d) < maxMinRange[0] || scale(d) > maxMinRange[1]) {
                                if (d > 1e-10 || d < -1e-10) // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
                                    d3.select(this).remove();
                                else
                                    d3.select(this).select('text').remove(); // Don't remove the ZERO line!!
                            }
                        });
                }


                //highlight zero line ... Maybe should not be an option and should just be in CSS?
                if (highlightZero)
                    g.selectAll('line.tick')
                        .filter(function(d) { return !parseFloat(Math.round(d*100000)/1000000) }) //this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
                        .classed('zero', true);

                //store old scales for use in transitions on update
                scale0 = scale.copy();

            });

            return chart;
        }


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        d3.rebind(chart, axis, 'orient', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
        d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands'); //these are also accessible by chart.scale(), but added common ones directly for ease of use

        chart.margin = function(_) {
            if(!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        }

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.ticks = function(_) {
            if (!arguments.length) return ticks;
            ticks = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.axisLabel = function(_) {
            if (!arguments.length) return axisLabelText;
            axisLabelText = _;
            return chart;
        }

        chart.showMaxMin = function(_) {
            if (!arguments.length) return showMaxMin;
            showMaxMin = _;
            return chart;
        }

        chart.highlightZero = function(_) {
            if (!arguments.length) return highlightZero;
            highlightZero = _;
            return chart;
        }

        chart.scale = function(_) {
            if (!arguments.length) return scale;
            scale = _;
            axis.scale(scale);
            d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands');
            return chart;
        }

        chart.rotateYLabel = function(_) {
            if(!arguments.length) return rotateYLabel;
            rotateYLabel = _;
            return chart;
        }

        chart.rotateLabels = function(_) {
            if(!arguments.length) return rotateLabels;
            rotateLabels = _;
            return chart;
        }

        //============================================================


        return chart;
    }
    /**
     * bar行
     * @return {Function}
     */
    im3.models.multiBar = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin = {top: 0, right: 0, bottom: 0, left: 0}
            , width = 960
            , height = 500
            , x = d3.scale.ordinal()
            , y = d3.scale.linear()
            , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
            , getX = function(d) { return d.x }
            , getY = function(d) { return d.y }
            , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
            , clipEdge = true
            , stacked = false
            , color = im3.utils.defaultColor()
            , delay = 1200
            , xDomain
            , yDomain
            , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
            ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var x0, y0 //used to store previous scales
            ;

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var availableWidth = width - margin.left - margin.right,
                    availableHeight = height - margin.top - margin.bottom,
                    container = d3.select(this);

                if (stacked)
                    data = d3.layout.stack()
                        .offset('zero')
                        .values(function(d){ return d.values })
                        .y(getY)
                        (data);


                //add series index to each data point for reference
                data = data.map(function(series, i) {
                    series.values = series.values.map(function(point) {
                        point.series = i;
                        return point;
                    });
                    return series;
                });


                //------------------------------------------------------------
                // Setup Scales

                // remap and flatten the data for use in calculating the scales' domains
                var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
                    data.map(function(d) {
                        return d.values.map(function(d,i) {
                            return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
                        })
                    });

                x   .domain(d3.merge(seriesData).map(function(d) { return d.x }))
                    .rangeBands([0, availableWidth], .1);

                y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))
                    .range([availableHeight, 0]);


                // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
                if (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]) singlePoint = true;
                if (x.domain()[0] === x.domain()[1])
                    x.domain()[0] ?
                        x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
                        : x.domain([-1,1]);

                if (y.domain()[0] === y.domain()[1])
                    y.domain()[0] ?
                        y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
                        : y.domain([-1,1]);


                x0 = x0 || x;
                y0 = y0 || y;

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-multibar').data([data]);
                var wrapEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-multibar');
                var defsEnter = wrapEnter.append('defs');
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g')

                gEnter.append('g').attr('class', 'im-groups');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------



                defsEnter.append('clipPath')
                    .attr('id', 'im-edge-clip-' + id)
                    .append('rect');
                wrap.select('#im-edge-clip-' + id + ' rect')
                    .attr('width', availableWidth)
                    .attr('height', availableHeight);

                g   .attr('clip-path', clipEdge ? 'url(#im-edge-clip-' + id + ')' : '');



                var groups = wrap.select('.im-groups').selectAll('.im-group')
                    .data(function(d) { return d }, function(d) { return d.key });
                groups.enter().append('g')
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6);
                d3.transition(groups.exit())
                    //.style('stroke-opacity', 1e-6)
                    //.style('fill-opacity', 1e-6)
                    .selectAll('rect.im-bar')
                    .delay(function(d,i) { return i * delay/ data[0].values.length })
                    .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
                    .attr('height', 0)
                    .remove();
                groups
                    .attr('class', function(d,i) { return 'im-group im-series-' + i })
                    .classed('hover', function(d) { return d.hover })
                    .style('fill', function(d,i){ return color(d, i) })
                    .style('stroke', function(d,i){ return color(d, i) });
                d3.transition(groups)
                    .style('stroke-opacity', 1)
                    .style('fill-opacity', .75);


                var bars = groups.selectAll('rect.im-bar')
                    .data(function(d) { return d.values });

                bars.exit().remove();


                var barsEnter = bars.enter().append('rect')
                    .attr('class', function(d,i) { return getY(d,i) < 0 ? 'im-bar negative' : 'im-bar positive'})
                    .attr('x', function(d,i,j) {
                        return stacked ? 0 : (j * x.rangeBand() / data.length )
                    })
                    .attr('y', function(d) { return y0(stacked ? d.y0 : 0) })
                    .attr('height', 0)
                    .attr('width',15);// x.rangeBand() / (stacked ? 1 : data.length) );
                bars
                    .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        value: getY(d,i),
                        point: d,
                        series: data[d.series],
                        pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                        pointIndex: i,
                        seriesIndex: d.series,
                        e: d3.event
                    });
                })
                    .on('mouseout', function(d,i) {
                        d3.select(this).classed('hover', false);
                        dispatch.elementMouseout({
                            value: getY(d,i),
                            point: d,
                            series: data[d.series],
                            pointIndex: i,
                            seriesIndex: d.series,
                            e: d3.event
                        });
                    })
                    .on('click', function(d,i) {
                        dispatch.elementClick({
                            value: getY(d,i),
                            point: d,
                            series: data[d.series],
                            pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                            pointIndex: i,
                            seriesIndex: d.series,
                            e: d3.event
                        });
                        d3.event.stopPropagation();
                    })
                    .on('dblclick', function(d,i) {
                        dispatch.elementDblClick({
                            value: getY(d,i),
                            point: d,
                            series: data[d.series],
                            pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                            pointIndex: i,
                            seriesIndex: d.series,
                            e: d3.event
                        });
                        d3.event.stopPropagation();
                    });
                bars
                    .attr('class', function(d,i) { return getY(d,i) < 0 ? 'im-bar negative' : 'im-bar positive'})
                    .attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })
                if (stacked)
                    d3.transition(bars)
                        .delay(function(d,i) { return i * delay / data[0].values.length })
                        .attr('y', function(d,i) {
                            return y(getY(d,i) + (stacked ? d.y0 : 0));
                        })
                        .attr('height', function(d,i) {
                            return Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0)))
                        })
                        .each('end', function() {
                            d3.transition(d3.select(this))
                                .attr('x', function(d,i) {
                                    return stacked ? 0 : (d.series * x.rangeBand() / data.length )
                                })
                                .attr('width', x.rangeBand() / (stacked ? 1 : data.length) );
                        })
                else
                    d3.transition(bars)
                        .delay(function(d,i) { return i * delay/ data[0].values.length })
                        .attr('x', function(d,i) {
                            return d.series * x.rangeBand() / data.length
                        })
                        .attr('width',15) //x.rangeBand() / data.length)
                        .each('end', function() {
                            d3.transition(d3.select(this))
                                .attr('y', function(d,i) {
                                    return getY(d,i) < 0 ?
                                        y(0) :
                                        y(getY(d,i))
                                })
                                .attr('height', function(d,i) {
                                    return Math.abs(y(getY(d,i)) - y(0))
                                });
                        })


                //store old scales for use in transitions on update
                x0 = x.copy();
                y0 = y.copy();

            });

            return chart;
        }


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        chart.dispatch = dispatch;

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = _;
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = _;
            return chart;
        };

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.xScale = function(_) {
            if (!arguments.length) return x;
            x = _;
            return chart;
        };

        chart.yScale = function(_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };

        chart.xDomain = function(_) {
            if (!arguments.length) return xDomain;
            xDomain = _;
            return chart;
        };

        chart.yDomain = function(_) {
            if (!arguments.length) return yDomain;
            yDomain = _;
            return chart;
        };

        chart.forceY = function(_) {
            if (!arguments.length) return forceY;
            forceY = _;
            return chart;
        };

        chart.stacked = function(_) {
            if (!arguments.length) return stacked;
            stacked = _;
            return chart;
        };

        chart.clipEdge = function(_) {
            if (!arguments.length) return clipEdge;
            clipEdge = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            return chart;
        };

        chart.id = function(_) {
            if (!arguments.length) return id;
            id = _;
            return chart;
        };

        chart.delay = function(_) {
            if (!arguments.length) return delay;
            delay = _;
            return chart;
        };

        //============================================================


        return chart;
    }


    im3.models.multiBarChart = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var multibar = im3.models.multiBar()
            , xAxis = im3.models.axis()
            , yAxis = im3.models.axis()
            , legend = im3.models.legend()
            , controls = im3.models.legend()
            ;

        var margin = {top: 30, right: 20, bottom: 50, left: 60}
            , width = null
            , height = null
            , color = im3.utils.defaultColor()
            , showControls = false
            , showLegend = false
            , reduceXTicks = false // if false a tick will show for every data point
            , rotateLabels = 0
            , tooltips = false
            , tooltip = function(key, x, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + ' on ' + x + '</p>'
            }
            , x //can be accessed via chart.xScale()
            , y //can be accessed via chart.yScale()
            , noData = "No Data Available."
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
            ;

        multibar
            .stacked(false)
        ;
        xAxis
            .orient('bottom')
            .tickPadding(5)
            .highlightZero(false)
            .showMaxMin(false)
            .tickFormat(function(d) { return d })
        ;
        yAxis
            .orient('left')
            .tickFormat(d3.format(',.1f'))
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
            var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
                top = e.pos[1] + ( offsetElement.offsetTop || 0),
                x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
                y = yAxis.tickFormat()(multibar.y()(e.point, e.pointIndex)),
                content = tooltip(e.series.key, x, y, e, chart);

            im3.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
        };

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { selection.transition().call(chart) };
                chart.container = this;


                //------------------------------------------------------------
                // Display noData message if there's nothing to show.

                if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                    var noDataText = container.selectAll('.im-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'imd3 im-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.im-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Scales

                x = multibar.xScale();
                y = multibar.yScale();

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-multiBarWithLegend').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-multiBarWithLegend').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-x im-axis');
                gEnter.append('g').attr('class', 'im-y im-axis');
                gEnter.append('g').attr('class', 'im-barsWrap');
                gEnter.append('g').attr('class', 'im-legendWrap');
                gEnter.append('g').attr('class', 'im-controlsWrap');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend.width(availableWidth / 2);

                    g.select('.im-legendWrap')
                        .datum(data)
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                            - margin.top - margin.bottom;
                    }

                    g.select('.im-legendWrap')
                        .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Controls

                if (showControls) {
                    var controlsData = [
                        { key: 'Grouped', disabled: multibar.stacked() },
                        { key: 'Stacked', disabled: !multibar.stacked() }
                    ];

                    controls.width(180).color(['#444', '#444', '#444']);
                    g.select('.im-controlsWrap')
                        .datum(controlsData)
                        .attr('transform', 'translate(0,' + (-margin.top) +')')
                        .call(controls);
                }

                //------------------------------------------------------------


                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                //------------------------------------------------------------
                // Main Chart Component(s)

                multibar
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled }))


                var barsWrap = g.select('.im-barsWrap')
                    .datum(data.filter(function(d) { return !d.disabled }))

                d3.transition(barsWrap).call(multibar);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Axes

                xAxis
                    .scale(x)
                    .ticks( availableWidth / 100 )
                    .tickSize(-availableHeight, 0);

                g.select('.im-x.im-axis')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')');
                d3.transition(g.select('.im-x.im-axis'))
                    .call(xAxis);

                var xTicks = g.select('.im-x.im-axis > g').selectAll('g');

                xTicks
                    .selectAll('line, text')
                    .style('opacity', 1)

                if (reduceXTicks)
                    xTicks
                        .filter(function(d,i) {
                        return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
                    })
                        .selectAll('text, line')
                        .style('opacity', 0);

                if(rotateLabels)
                    xTicks
                        .selectAll('text')
                        .attr('transform', function(d,i,j) { return 'rotate('+rotateLabels+' 0,0)' })
                        .attr('text-transform', rotateLabels > 0 ? 'start' : 'end');

                yAxis
                    .scale(y)
                    .ticks( availableHeight / 36 )
                    .tickSize( -availableWidth, 0);

                d3.transition(g.select('.im-y.im-axis'))
                    .call(yAxis);

                //------------------------------------------------------------



                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('legendClick', function(d,i) {
                    d.disabled = !d.disabled;

                    if (!data.filter(function(d) { return !d.disabled }).length) {
                        data.map(function(d) {
                            d.disabled = false;
                            wrap.selectAll('.im-series').classed('disabled', false);
                            return d;
                        });
                    }

                    selection.transition().call(chart);
                });

                controls.dispatch.on('legendClick', function(d,i) {
                    if (!d.disabled) return;
                    controlsData = controlsData.map(function(s) {
                        s.disabled = true;
                        return s;
                    });
                    d.disabled = false;

                    switch (d.key) {
                        case 'Grouped':
                            multibar.stacked(false);
                            break;
                        case 'Stacked':
                            multibar.stacked(true);
                            break;
                    }

                    selection.transition().call(chart);
                });

                dispatch.on('tooltipShow', function(e) {
                    if (tooltips) showTooltip(e, that.parentNode)
                });

                //============================================================


            });

            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        multibar.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        multibar.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });
        dispatch.on('tooltipHide', function() {
            if (tooltips) im3.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.multibar = multibar;
        chart.legend = legend;
        chart.xAxis = xAxis;
        chart.yAxis = yAxis;

        d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'stacked', 'delay');

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            legend.color(color);
            return chart;
        };

        chart.showControls = function(_) {
            if (!arguments.length) return showControls;
            showControls = _;
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.reduceXTicks= function(_) {
            if (!arguments.length) return reduceXTicks;
            reduceXTicks = _;
            return chart;
        };

        chart.rotateLabels = function(_) {
            if (!arguments.length) return rotateLabels;
            rotateLabels = _;
            return chart;
        }

        chart.tooltip = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        //============================================================


        return chart;
    }










    im3.models.multiBarHorizontal = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin = {top: 0, right: 0, bottom: 0, left: 0}
            , width = 960
            , height = 500
            , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
            , x = d3.scale.ordinal()
            , y = d3.scale.linear()
            , getX = function(d) { return d.x }
            , getY = function(d) { return d.y }
            , getX0 = function(d) { return d.x0 }
            , getY0 = function(d) { return d.y0 }
            , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
            , color = im3.utils.defaultColor()
            , stacked = false
            , showValues = false
            , valuePadding = 60
            , valueFormat = d3.format(',.2f')
            , delay = 1200
            , xDomain
            , yDomain
            , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
            ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var x0, y0 //used to store previous scales
            ;

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var availableWidth = width - margin.left - margin.right,
                    availableHeight = height - margin.top - margin.bottom,
                    container = d3.select(this);


                if (stacked)
                    data = d3.layout.stack()
                        .offset('zero')
                        .values(function(d){ return d.values })
                        .y(getY)
                        (data);


                //add series index to each data point for reference
                data = data.map(function(series, i) {
                    series.values = series.values.map(function(point) {
                        point.series = i;
                        return point;
                    });
                    return series;
                });


                //------------------------------------------------------------
                // Setup Scales

                // remap and flatten the data for use in calculating the scales' domains
                var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
                    data.map(function(d) {
                        return d.values.map(function(d,i) {
                            return { x: getX(d,i), y: getY(d,i), y0: getY0(d,i),x0:getX0(d,i) }
                        })
                    });

                x   .domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
                    .rangeBands([0, availableHeight], .1);

                y   .domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY)))

                if (showValues && !stacked)
                    y.range([(y.domain()[0] < 0 ? valuePadding : 0), availableWidth - (y.domain()[1] > 0 ? valuePadding : 0) ]);
                else
                    y.range([0, availableWidth]);

                x0 = x0 || x;
                y0 = y0 || d3.scale.linear().domain(y.domain()).range([y(0),y(0)]);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = d3.select(this).selectAll('g.im-wrap.im-multibarHorizontal').data([data]);
                var wrapEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-multibarHorizontal');
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-groups');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------



                var groups = wrap.select('.im-groups').selectAll('.im-group')
                    .data(function(d) { return d }, function(d) { return d.key });
                groups.enter().append('g')
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6);
                d3.transition(groups.exit())
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6)
                    .remove();
                groups
                    .attr('class', function(d,i) { return 'im-group im-series-' + i })
                    .classed('hover', function(d) { return d.hover })
                    .style('fill', function(d,i){ return color(d, i) })
                    .style('stroke', function(d,i){ return color(d, i) });
                d3.transition(groups)
                    .style('stroke-opacity', 1)
                    .style('fill-opacity', .75);


                var bars = groups.selectAll('g.im-bar')
                    .data(function(d) { return d.values });

                bars.exit().remove();


                var barsEnter = bars.enter().append('g')
                    .attr('transform', function(d,i,j) {
                        return 'translate(' + y0(stacked ? d.y0 : 0) + ',' + (stacked ? 0 : (j * x.rangeBand() / data.length ) + x(getX(d,i))) + ')'
                    });

                barsEnter.append('rect')
                    .attr('width', 0)
                    .attr('height', x.rangeBand() / (stacked ? 1 : data.length) )

                bars
                    .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
                    d3.select(this).classed('hover', true);
                    dispatch.elementMouseover({
                        value: getY(d,i),
                        point: d,
                        series: data[d.series],
                        pos: [ y(getY(d,i) + (stacked ? d.y0 : 0)), x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length) ],
                        pointIndex: i,
                        seriesIndex: d.series,
                        e: d3.event
                    });
                })
                    .on('mouseout', function(d,i) {
                        d3.select(this).classed('hover', false);
                        dispatch.elementMouseout({
                            value: getY(d,i),
                            point: d,
                            series: data[d.series],
                            pointIndex: i,
                            seriesIndex: d.series,
                            e: d3.event
                        });
                    })
                    .on('click', function(d,i) {
                        dispatch.elementClick({
                            value: getY(d,i),
                            point: d,
                            series: data[d.series],
                            pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                            pointIndex: i,
                            seriesIndex: d.series,
                            e: d3.event
                        });
                        d3.event.stopPropagation();
                    })
                    .on('dblclick', function(d,i) {
                        dispatch.elementDblClick({
                            value: getY(d,i),
                            point: d,
                            series: data[d.series],
                            pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
                            pointIndex: i,
                            seriesIndex: d.series,
                            e: d3.event
                        });
                        d3.event.stopPropagation();
                    });

                if (showValues && !stacked) {
                    barsEnter.append('text')
                        .attr('text-anchor', function(d,i) { return getY(d,i) < 0 ? 'end' : 'start' })
                    bars.select('text')
                        .attr('y', x.rangeBand() / 2)
                        .attr('dy', '-.32em')
                        .text(function(d,i) { return valueFormat(getY(d,i)) })
                    d3.transition(bars)
                        //.delay(function(d,i) { return i * delay / data[0].values.length })
                        .select('text')
                        .attr('x', function(d,i) { return getY(d,i) < 0 ? -4 : y(getY(d,i)) - y(0) + 4 })
                } else {
                    bars.selectAll('text').remove();
                }

                bars
                    .attr('class', function(d,i) { return getY(d,i) < 0 ? 'im-bar negative' : 'im-bar positive'})
                //.attr('transform', function(d,i,j) {
                //return 'translate(' + y0(stacked ? d.y0 : 0) + ',' + x(getX(d,i)) + ')'
                //})
                if (stacked)
                    d3.transition(bars)
                        //.delay(function(d,i) { return i * delay / data[0].values.length })
                        .attr('transform', function(d,i) {
                            //return 'translate(' + y(d.y0) + ',0)'
                            return 'translate(' + y(d.y0) + ',' + x(getX(d,i)) + ')'
                        })
                        .select('rect')
                        .attr('width', function(d,i) {
                            return Math.abs(y(getY(d,i) + d.y0) - y(d.y0))
                        })
                        .attr('height', x.rangeBand() );
                else
                    d3.transition(bars)
                        //.delay(function(d,i) { return i * delay / data[0].values.length })
                        .attr('transform', function(d,i) {
                            //TODO: stacked must be all positive or all negative, not both?
                            return 'translate(' +
                                (getY(d,i) < 0 ? y(getY(d,i)) : (getY0(d,i)?y(getY0(d,i)):y(0)))
                                + ',' +
                                (d.series * x.rangeBand() / data.length
                                    +
                                    x(getX(d,i)) )
                                + ')'
                        })
                        .select('rect')
                        .attr('height', x.rangeBand() / data.length )
                        .attr('width', function(d,i) {

                            return Math.abs(y(getY(d,i)) - (getY0(d,i)?y(getY0(d,i)):y(0)))
                        });


                //store old scales for use in transitions on update
                x0 = x.copy();
                y0 = y.copy();

            });

            return chart;
        }


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        chart.dispatch = dispatch;

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = _;
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = _;
            return chart;
        };

        chart.x0 = function(_) {
            if (!arguments.length) return getX0;
            getX0 = _;
            return chart;
        };

        chart.y0 = function(_) {
            if (!arguments.length) return getY0;
            getY0 = _;
            return chart;
        };






        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.xScale = function(_) {
            if (!arguments.length) return x;
            x = _;
            return chart;
        };

        chart.yScale = function(_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };

        chart.xDomain = function(_) {
            if (!arguments.length) return xDomain;
            xDomain = _;
            return chart;
        };

        chart.yDomain = function(_) {
            if (!arguments.length) return yDomain;
            yDomain = _;
            return chart;
        };

        chart.forceY = function(_) {
            if (!arguments.length) return forceY;
            forceY = _;
            return chart;
        };

        chart.stacked = function(_) {
            if (!arguments.length) return stacked;
            stacked = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            return chart;
        };

        chart.id = function(_) {
            if (!arguments.length) return id;
            id = _;
            return chart;
        };

        chart.delay = function(_) {
            if (!arguments.length) return delay;
            delay = _;
            return chart;
        };

        chart.showValues = function(_) {
            if (!arguments.length) return showValues;
            showValues = _;
            return chart;
        };

        chart.valueFormat= function(_) {
            if (!arguments.length) return valueFormat;
            valueFormat = _;
            return chart;
        };

        chart.valuePadding = function(_) {
            if (!arguments.length) return valuePadding;
            valuePadding = _;
            return chart;
        };

        //============================================================


        return chart;
    }

    im3.models.multiBarHorizontalChart = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var multibar = im3.models.multiBarHorizontal()
            , xAxis = im3.models.axis()
            , yAxis = im3.models.axis()
            , legend = im3.models.legend().height(30)
            , controls = im3.models.legend().height(30)
            ;

        var margin = {top: 30, right: 20, bottom: 50, left: 60}
            , width = null
            , height = null
            , color = im3.utils.defaultColor()
            , showControls = true
            , showLegend = true
            , stacked = false
            , tooltips = true
            , tooltip = function(key, x, y, e, graph) {
                return '<h3>' + key + ' - ' + x + '</h3>' +
                    '<p>' +  y + '</p>'
            }
            , x //can be accessed via chart.xScale()
            , y //can be accessed via chart.yScale()
            , noData = noDataMessage()
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
            ;

        multibar
            .stacked(stacked)
        ;
        xAxis
            .orient('left')
            .tickPadding(5)
            .highlightZero(false)
            .showMaxMin(false)
            .tickFormat(function(d) { return d })
        ;
        yAxis
            .orient('bottom')
            .tickFormat(d3.format(',.1f'))
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
            var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
                top = e.pos[1] + ( offsetElement.offsetTop || 0),
                x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
                y = yAxis.tickFormat()(multibar.y()(e.point, e.pointIndex)),
                content = tooltip(e.series.key, x, y, e, chart);

            im3.tooltip.show([left, top], content, e.value < 0 ? 'e' : 'w', null, offsetElement);
        };

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { selection.transition().call(chart) };
                chart.container = this;


                //------------------------------------------------------------
                // Display No Data message if there's nothing to show.

                if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                    var noDataText = container.selectAll('.im-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'im3 im-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.im-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Scales

                x = multibar.xScale();
                y = multibar.yScale();

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-multiBarHorizontalChart').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-multiBarHorizontalChart').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-x im-axis');
                gEnter.append('g').attr('class', 'im-y im-axis');
                gEnter.append('g').attr('class', 'im-barsWrap');
                gEnter.append('g').attr('class', 'im-legendWrap');
                gEnter.append('g').attr('class', 'im-controlsWrap');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend.width(availableWidth / 2);

                    g.select('.im-legendWrap')
                        .datum(data)
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                            - margin.top - margin.bottom;
                    }

                    g.select('.im-legendWrap')
                        .attr('transform', 'translate(' + (availableWidth / 2) + ',' + (-margin.top) +')');
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Controls

                if (showControls) {
                    var controlsData = [
                        { key: 'Grouped', disabled: multibar.stacked() },
                        { key: 'Stacked', disabled: !multibar.stacked() }
                    ];

                    controls.width(180).color(['#444', '#444', '#444']);
                    g.select('.im-controlsWrap')
                        .datum(controlsData)
                        .attr('transform', 'translate(0,' + (-margin.top) +')')
                        .call(controls);
                }

                //------------------------------------------------------------


                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                //------------------------------------------------------------
                // Main Chart Component(s)

                multibar
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled })).x0(function(d){return  0.5;});


                var barsWrap = g.select('.im-barsWrap')
                    .datum(data.filter(function(d) { return !d.disabled }))

                d3.transition(barsWrap).call(multibar);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Axes

                xAxis
                    .scale(x)
                   // .ticks( availableHeight / 24 )
                    .tickSize(-availableWidth, 0);

                d3.transition(g.select('.im-x.im-axis'))
                    .call(xAxis);

                var xTicks = g.select('.im-x.im-axis').selectAll('g');

                xTicks
                    .selectAll('line, text')
                    .style('opacity', 1)


                yAxis
                    .scale(y)
                    //.ticks( availableWidth / 100 )
                    .tickSize( -availableHeight, 0);

                g.select('.im-y.im-axis')
                    .attr('transform', 'translate(0,' + availableHeight + ')');
                d3.transition(g.select('.im-y.im-axis'))
                    .call(yAxis);

                //------------------------------------------------------------



                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('legendClick', function(d,i) {
                    d.disabled = !d.disabled;

                    if (!data.filter(function(d) { return !d.disabled }).length) {
                        data.map(function(d) {
                            d.disabled = false;
                            wrap.selectAll('.im-series').classed('disabled', false);
                            return d;
                        });
                    }

                    selection.transition().call(chart);
                });

                controls.dispatch.on('legendClick', function(d,i) {
                    if (!d.disabled) return;
                    controlsData = controlsData.map(function(s) {
                        s.disabled = true;
                        return s;
                    });
                    d.disabled = false;

                    switch (d.key) {
                        case 'Grouped':
                            multibar.stacked(false);
                            break;
                        case 'Stacked':
                            multibar.stacked(true);
                            break;
                    }

                    selection.transition().call(chart);
                });

                dispatch.on('tooltipShow', function(e) {
                    if (tooltips) showTooltip(e, that.parentNode);
                });

                //============================================================


            });

            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        multibar.dispatch.on('elementClick.tooltip', function(e) {
        	dispatch.tooltipHide(e);
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

//        multibar.dispatch.on('elementMouseout.tooltip', function(e) {
//            dispatch.tooltipHide(e);
//        });
        dispatch.on('tooltipHide', function() {
            if (tooltips) im3.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.multibar = multibar;
        chart.legend = legend;
        chart.xAxis = xAxis;
        chart.yAxis = yAxis;

        d3.rebind(chart, multibar, 'x', 'y', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'id', 'delay', 'showValues', 'valueFormat', 'stacked');

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            legend.color(color);
            return chart;
        };

        chart.showControls = function(_) {
            if (!arguments.length) return showControls;
            showControls = _;
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltip = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        //============================================================


        return chart;
    }

    /**
     * 面积图
     * @return {Function}
     */
    im3.models.stackedArea = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin = {top: 0, right: 0, bottom: 0, left: 0}
            , width = 960
            , height = 500
            , color = im3.utils.defaultColor() // a function that computes the color
            , id = Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't selet one
            , getX = function(d) { return d.x } // accessor to get the x value from a data point
            , getY = function(d) { return d.y } // accessor to get the y value from a data point
            , style = 'stack'
            , offset = 'zero'
            , order = 'default'
            , clipEdge = false // if true, masks lines within x and y scale
            , x //can be accessed via chart.xScale()
            , y //can be accessed via chart.yScale()
            , scatter = im3.models.scatter()
            , dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'areaClick', 'areaMouseover', 'areaMouseout')
            ;

        scatter
            .size(2.2) // default size
            .sizeDomain([2.2]) // all the same size by default
        ;

        /************************************
         * offset:
         *   'wiggle' (stream)
         *   'zero' (stacked)
         *   'expand' (normalize to 100%)
         *   'silhouette' (simple centered)
         *
         * order:
         *   'inside-out' (stream)
         *   'default' (input order)
         ************************************/

            //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var availableWidth = width - margin.left - margin.right,
                    availableHeight = height - margin.top - margin.bottom,
                    container = d3.select(this);

                //------------------------------------------------------------
                // 确定x轴和y轴

                x = scatter.xScale();
                y = scatter.yScale();

                //------------------------------------------------------------


                // Injecting point index into each point because d3.layout.stack().out does not give index
                // ***Also storing getY(d,i) as stackedY so that it can be set to 0 if series is disabled
                data = data.map(function(aseries, i) {
                    aseries.values = aseries.values.map(function(d, j) {
                        d.index = j;
                        d.stackedY = aseries.disabled ? 0 : getY(d,j);
                        return d;
                    })
                    return aseries;
                });


                data = d3.layout.stack()
                    .order(order)
                    .offset(offset)
                    .values(function(d) { return d.values })  //TODO: make values customizeable in EVERY model in this fashion
                    .x(getX)
                    .y(function(d) { return d.stackedY })
                    .out(function(d, y0, y) {
                        d.display = {
                            y: y,
                            y0: 0
                        };
                    })
                    (data);


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-stackedarea').data([data]);
                var wrapEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-stackedarea');
                var defsEnter = wrapEnter.append('defs');
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-areaWrap');
                gEnter.append('g').attr('class', 'im-scatterWrap');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------


                scatter
                    .width(availableWidth)
                    .height(availableHeight)
                    .x(getX)
                    .y(function(d) { return d.display.y + d.display.y0 })
                    .forceY([0])
                    .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled }));


                var scatterWrap = g.select('.im-scatterWrap')
                    .datum(data.filter(function(d) { return !d.disabled }))

                d3.transition(scatterWrap).call(scatter);





                defsEnter.append('clipPath')
                    .attr('id', 'im-edge-clip-' + id)
                    .append('rect');

                wrap.select('#im-edge-clip-' + id + ' rect')
                    .attr('width', availableWidth)
                    .attr('height', availableHeight);

                g   .attr('clip-path', clipEdge ? 'url(#im-edge-clip-' + id + ')' : '');




                var area = d3.svg.area()
                    .x(function(d,i)  { return x(getX(d,i)) })
                    .y0(function(d) { return y(d.display.y0) })
                    .y1(function(d) { return y(d.display.y + d.display.y0) });

                var zeroArea = d3.svg.area()
                    .x(function(d,i)  { return x(getX(d,i)) })
                    .y0(function(d) { return y(d.display.y0) })
                    .y1(function(d) { return y(d.display.y0) });


                var path = g.select('.im-areaWrap').selectAll('path.im-area')
                    .data(function(d) { return d });
                //.data(function(d) { return d }, function(d) { return d.key });
                path.enter().append('path').attr('class', function(d,i) { return 'im-area im-area-' + i })
                    .on('mouseover', function(d,i) {
                        d3.select(this).classed('hover', true);
                        dispatch.areaMouseover({
                            point: d,
                            series: d.key,
                            pos: [d3.event.pageX, d3.event.pageY],
                            seriesIndex: i
                        });
                    })
                    .on('mouseout', function(d,i) {
                        d3.select(this).classed('hover', false);
                        dispatch.areaMouseout({
                            point: d,
                            series: d.key,
                            pos: [d3.event.pageX, d3.event.pageY],
                            seriesIndex: i
                        });
                    })
                    .on('click', function(d,i) {
                        d3.select(this).classed('hover', false);
                        dispatch.areaClick({
                            point: d,
                            series: d.key,
                            pos: [d3.event.pageX, d3.event.pageY],
                            seriesIndex: i
                        });
                    })
                d3.transition(path.exit())
                    .attr('d', function(d,i) { return zeroArea(d.values,i) })
                    .remove();
                path
                    .style('fill', function(d,i){ return d.color || color(d, i) })
                    .style('stroke', function(d,i){ return d.color || color(d, i) });
                d3.transition(path)
                    .attr('d', function(d,i) { return area(d.values,i) })


                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                scatter.dispatch.on('elementMouseover.area', function(e) {
                    g.select('.im-chart-' + id + ' .im-area-' + e.seriesIndex).classed('hover', true);
                });
                scatter.dispatch.on('elementMouseout.area', function(e) {
                    g.select('.im-chart-' + id + ' .im-area-' + e.seriesIndex).classed('hover', false);
                });

                //============================================================

            });


            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        scatter.dispatch.on('elementClick.area', function(e) {
            dispatch.areaClick(e);
        })
        scatter.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
                dispatch.tooltipShow(e);
        });
        scatter.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

        //============================================================


        //============================================================
        // Global getters and setters
        //------------------------------------------------------------

        chart.dispatch = dispatch;
        chart.scatter = scatter;

        d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = d3.functor(_);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = d3.functor(_);
            return chart;
        }

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.clipEdge = function(_) {
            if (!arguments.length) return clipEdge;
            clipEdge = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            return chart;
        };

        chart.offset = function(_) {
            if (!arguments.length) return offset;
            offset = _;
            return chart;
        };

        chart.order = function(_) {
            if (!arguments.length) return order;
            order = _;
            return chart;
        };

        //shortcut for offset + order
        chart.style = function(_) {
            if (!arguments.length) return style;
            style = _;

            switch (style) {
                case 'stack':
                    chart.offset('zero');
                    chart.order('default');
                    break;
                case 'stream':
                    chart.offset('wiggle');
                    chart.order('inside-out');
                    break;
                case 'stream-center':
                    chart.offset('silhouette');
                    chart.order('inside-out');
                    break;
                case 'expand':
                    chart.offset('expand');
                    chart.order('default');
                    break;
            }

            return chart;
        };

        //============================================================


        return chart;
    }

    /**
     * 显示各种配置的面及图
     * @return {Function}
     */
    im3.models.stackedAreaChart = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var stacked = im3.models.stackedArea()
            , xAxis = im3.models.axis()
            , yAxis = im3.models.axis()
            , legend = im3.models.legend()
            , controls = im3.models.legend()
            ;

        var margin = {top: 30, right: 25, bottom: 50, left: 60}
            , width = null
            , height = null
            , color = im3.utils.defaultColor() // a function that takes in d, i and returns color
            , showControls = false//显示模式
            , showLegend = true//图例
            , tooltips = true//显示点的信息
            , tooltip = function(key, x, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + ' on ' + x + '</p>'
            }
            , x //can be accessed via chart.xScale()
            , y //can be accessed via chart.yScale()
            , yAxisTickFormat = d3.format(',.2f')
            , noData = noDataMessage()
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
            ;

        xAxis
            .orient('bottom')
            .tickPadding(5)
        ;
        yAxis
            .orient('left')
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {
            var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
                top = e.pos[1] + ( offsetElement.offsetTop || 0),
                x = xAxis.tickFormat()(stacked.x()(e.point, e.pointIndex)),
                y = yAxis.tickFormat()(stacked.y()(e.point, e.pointIndex)),
                content = tooltip(e.series.key, x, y, e, chart);

            im3.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
        };

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;

                chart.update = function() { chart(selection) };
                chart.container = this;

                //------------------------------------------------------------
                // Display No Data message if there's nothing to show.

                if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                    var noDataText = container.selectAll('.im-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'imd3 im-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.im-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Scales

                x = stacked.xScale();
                y = stacked.yScale();

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-stackedAreaChart').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-stackedAreaChart').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-x im-axis');
                gEnter.append('g').attr('class', 'im-y im-axis');
                gEnter.append('g').attr('class', 'im-stackedWrap');
                gEnter.append('g').attr('class', 'im-legendWrap');
                gEnter.append('g').attr('class', 'im-controlsWrap');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend
                        .width( availableWidth / 2 );

                    g.select('.im-legendWrap')
                        .datum(data)
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                            - margin.top - margin.bottom;
                    }

                    g.select('.im-legendWrap')
                        .attr('transform', 'translate(' + ( availableWidth / 2 ) + ',' + (-margin.top) +')');
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Controls

                if (showControls) {
                    var controlsData = [
                        { key: 'Stacked', disabled: stacked.offset() != 'zero' },
                        { key: 'Stream', disabled: stacked.offset() != 'wiggle' },
                        { key: 'Expanded', disabled: stacked.offset() != 'expand' }
                    ];

                    controls.width(280).color(['#444', '#444', '#444']);
                    g.select('.im-controlsWrap')
                        .datum(controlsData)
                        .attr('transform', 'translate(0,' + (-margin.top) +')')
                        .call(controls);
                }

                //------------------------------------------------------------


                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                //------------------------------------------------------------
                // Main Chart Component(s)

                stacked
                    .width(availableWidth)
                    .height(availableHeight)

                var stackedWrap = g.select('.im-stackedWrap')
                    .datum(data);
                d3.transition(stackedWrap).call(stacked);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // 对应的轴

                xAxis
                    .scale(x)
                    .ticks( availableWidth / 100 )
                    .tickSize( -availableHeight, 0);

                g.select('.im-x.im-axis')
                    .attr('transform', 'translate(0,' + availableHeight + ')');
                d3.transition(g.select('.im-x.im-axis'))
                    .call(xAxis);

                yAxis
                    .scale(y)
                    .ticks(stacked.offset() == 'wiggle' ? 0 : availableHeight / 36)
                    .tickSize(-availableWidth, 0)
                    .setTickFormat(stacked.offset() == 'expand' ? d3.format('%') : yAxisTickFormat);

                d3.transition(g.select('.im-y.im-axis'))
                    .call(yAxis);

                //------------------------------------------------------------


                //============================================================
                // 对应的事件
                //------------------------------------------------------------

                stacked.dispatch.on('areaClick.toggle', function(e) {
                    if (data.filter(function(d) { return !d.disabled }).length === 1)
                        data = data.map(function(d) {
                            d.disabled = false;
                            return d
                        });
                    else
                        data = data.map(function(d,i) {
                            d.disabled = (i != e.seriesIndex);
                            return d
                        });

                    selection.transition().call(chart);
                });

                legend.dispatch.on('legendClick', function(d,i) {
                    d.disabled = !d.disabled;

                    if (!data.filter(function(d) { return !d.disabled }).length) {
                        data.map(function(d) {
                            d.disabled = false;
                            return d;
                        });
                    }

                    selection.transition().call(chart);
                });

                controls.dispatch.on('legendClick', function(d,i) {
                    if (!d.disabled) return;

                    controlsData = controlsData.map(function(s) {
                        s.disabled = true;
                        return s;
                    });
                    d.disabled = false;

                    switch (d.key) {
                        case 'Stacked':
                            stacked.style('stack');
                            break;
                        case 'Stream':
                            stacked.style('stream');
                            break;
                        case 'Expanded':
                            stacked.style('expand');
                            break;
                    }

                    selection.transition().call(chart);
                });

                dispatch.on('tooltipShow', function(e) {
                    if (tooltips) showTooltip(e, that.parentNode);
                });

            });


            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        stacked.dispatch.on('tooltipShow', function(e) {
            //disable tooltips when value ~= 0
            //// TODO: consider removing points from voronoi that have 0 value instead of this hack
            if (!Math.round(stacked.y()(e.point) * 100)) {  // 100 will not be good for very small numbers... will have to think about making this valu dynamic, based on data range
                setTimeout(function() { d3.selectAll('.point.hover').classed('hover', false) }, 0);
                return false;
            }

            e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top],
                dispatch.tooltipShow(e);
        });

        stacked.dispatch.on('tooltipHide', function(e) {
            dispatch.tooltipHide(e);
        });

        dispatch.on('tooltipHide', function() {
            if (tooltips) im3.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.stacked = stacked;
        chart.legend = legend;
        chart.controls = controls;
        chart.xAxis = xAxis;
        chart.yAxis = yAxis;

        d3.rebind(chart, stacked, 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'sizeDomain', 'interactive', 'offset', 'order', 'style', 'clipEdge', 'forceX', 'forceY', 'forceSize');

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return getWidth;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return getHeight;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            legend.color(color);
            stacked.color(color);
            return chart;
        };

        chart.showControls = function(_) {
            if (!arguments.length) return showControls;
            showControls = _;
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltip = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        yAxis.setTickFormat = yAxis.tickFormat;
        yAxis.tickFormat = function(_) {
            if (!arguments.length) return yAxisTickFormat;
            yAxisTickFormat = _;
            return yAxis;
        };

        //============================================================

        return chart;
    }

    im3.models.legend = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin = {top: 5, right: 0, bottom: 5, left: 0}
            , width = 400
            , height = 20
            , getKey = function(d) { return d.key }
            , color = im3.utils.defaultColor()
            , align = true
            , dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout')
            ;

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var availableWidth = width - margin.left - margin.right,
                    container = d3.select(this);


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-legend').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'im3 im-legend').append('g');
                var g = wrap.select('g');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------


                var series = g.selectAll('.im-series')
                    .data(function(d) { return d });
                var seriesEnter = series.enter().append('g').attr('class', 'im-series')
                    .on('mouseover', function(d,i) {
                        dispatch.legendMouseover(d,i);  //TODO: Make consistent with other event objects
                    })
                    .on('mouseout', function(d,i) {
                        dispatch.legendMouseout(d,i);
                    })
                    .on('click', function(d,i) {
                        dispatch.legendClick(d,i);
                    })
                    .on('dblclick', function(d,i) {
                        dispatch.legendDblclick(d,i);
                    });
                seriesEnter.append('circle')
                    .style('stroke-width', 2)
                    .attr('r', 5);
                seriesEnter.append('text')
                    .attr('text-anchor', 'start')
                    .attr('dy', '.32em')
                    .attr('dx', '8');
                series.classed('disabled', function(d) { return d.disabled });
                series.exit().remove();
                series.select('circle')
                    .style('fill', function(d,i) { return d.color || color(d,i)})
                    .style('stroke', function(d,i) { return d.color || color(d, i) });
                series.select('text').text(getKey);


                //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)

                // NEW ALIGNING CODE, TODO: clean up
                if (align) {
                    var seriesWidths = [];
                    series.each(function(d,i) {
                        seriesWidths.push(d3.select(this).select('text').node().getComputedTextLength() + 28); // 28 is ~ the width of the circle plus some padding
                    });

                    //im.log('Series Widths: ', JSON.stringify(seriesWidths));

                    var seriesPerRow = 0;
                    var legendWidth = 0;
                    var columnWidths = [];

                    while ( legendWidth < availableWidth && seriesPerRow < seriesWidths.length) {
                        columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
                        legendWidth += seriesWidths[seriesPerRow++];
                    }


                    while ( legendWidth > availableWidth && seriesPerRow > 1 ) {
                        columnWidths = [];
                        seriesPerRow--;

                        for (k = 0; k < seriesWidths.length; k++) {
                            if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0) )
                                columnWidths[k % seriesPerRow] = seriesWidths[k];
                        }

                        legendWidth = columnWidths.reduce(function(prev, cur, index, array) {
                            return prev + cur;
                        });
                    }
                    //console.log(columnWidths, legendWidth, seriesPerRow);

                    var xPositions = [];
                    for (var i = 0, curX = 0; i < seriesPerRow; i++) {
                        xPositions[i] = curX;
                        curX += columnWidths[i];
                    }

                    series
                        .attr('transform', function(d, i) {
                        return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
                    });

                    //position legend as far right as possible within the total width
                    g.attr('transform', 'translate(' + (width - margin.right - legendWidth) + ',' + margin.top + ')');

                    height = margin.top + margin.bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20);

                } else {

                    var ypos = 5,
                        newxpos = 5,
                        maxwidth = 0,
                        xpos;
                    series
                        .attr('transform', function(d, i) {
                        var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
                        xpos = newxpos;

                        if (width < margin.left + margin.right + xpos + length) {
                            newxpos = xpos = 5;
                            ypos += 20;
                        }

                        newxpos += length;
                        if (newxpos > maxwidth) maxwidth = newxpos;

                        return 'translate(' + xpos + ',' + ypos + ')';
                    });

                    //position legend as far right as possible within the total width
                    g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

                    height = margin.top + margin.bottom + ypos + 15;

                }

            });

            return chart;
        }


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        chart.dispatch = dispatch;

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.key = function(_) {
            if (!arguments.length) return getKey;
            getKey = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            return chart;
        };

        chart.align = function(_) {
            if (!arguments.length) return align;
            align = _;
            return chart;
        };

        //============================================================


        return chart;
    }

    im3.models.scatter = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin      = {top: 0, right: 0, bottom: 0, left: 0}
            , width       = 960
            , height      = 500
            , color       = im3.utils.defaultColor() // chooses color
            , id          = Math.floor(Math.random() * 100000) //Create semi-unique ID incase user doesn't selet one
            , x           = d3.scale.linear()
            , y           = d3.scale.linear()
            , z           = d3.scale.linear() //linear because d3.svg.shape.size is treated as area
            , getX        = function(d) { return d.x } // accessor to get the x value
            , getY        = function(d) { return d.y } // accessor to get the y value
            , getSize     = function(d) { return d.size } // accessor to get the point size
            , getShape    = function(d) { return d.shape || 'circle' } // accessor to get point shape
            , forceX      = [] // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
            , forceY      = [] // List of numbers to Force into the Y scale
            , forceSize   = [] // List of numbers to Force into the Size scale
            , interactive = true // If true, plots a voronoi overlay for advanced point interection
            , pointActive = function(d) { return !d.notActive } // any points that return false will be filtered out
            , clipEdge    = false // if true, masks points within x and y scale
            , clipVoronoi = true // if true, masks each point with a circle... can turn off to slightly increase performance
            , clipRadius  = function() { return 25 } // function to get the radius for voronoi point clips
            , xDomain     = null // Override x domain (skips the calculation from data)
            , yDomain     = null // Override y domain
            , sizeDomain  = null // Override point size domain
            , sizeRange   = null
            , singlePoint = false
            , dispatch    = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout')
            , useVoronoi  = true
            ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var x0, y0, z0 // used to store previous scales
            , timeoutID
            ;

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var availableWidth = width - margin.left - margin.right,
                    availableHeight = height - margin.top - margin.bottom,
                    container = d3.select(this);

                //add series index to each data point for reference
                data = data.map(function(series, i) {
                    series.values = series.values.map(function(point) {
                        point.series = i;
                        return point;
                    });
                    return series;
                });

                //------------------------------------------------------------
                // Setup Scales

                // remap and flatten the data for use in calculating the scales' domains
                var seriesData = (xDomain && yDomain && sizeDomain) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
                    d3.merge(
                        data.map(function(d) {
                            return d.values.map(function(d,i) {
                                return { x: getX(d,i), y: getY(d,i), size: getSize(d,i) }
                            })
                        })
                    );

                x   .domain(xDomain || d3.extent(seriesData.map(function(d) { return d.x }).concat(forceX)))
                    .range([0, availableWidth]);

                y   .domain(yDomain || d3.extent(seriesData.map(function(d) { return d.y }).concat(forceY)))
                    .range([availableHeight, 0]);

                z   .domain(sizeDomain || d3.extent(seriesData.map(function(d) { return d.size }).concat(forceSize)))
                    .range(sizeRange || [16, 256]);

                // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
                if (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]) singlePoint = true;
                if (x.domain()[0] === x.domain()[1])
                    x.domain()[0] ?
                        x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
                        : x.domain([-1,1]);

                if (y.domain()[0] === y.domain()[1])
                    y.domain()[0] ?
                        y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
                        : y.domain([-1,1]);


                x0 = x0 || x;
                y0 = y0 || y;
                z0 = z0 || z;

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-scatter').data([data]);
                var wrapEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-scatter im-chart-' + id + (singlePoint ? ' im-single-point' : ''));
                var defsEnter = wrapEnter.append('defs');
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-groups');
                gEnter.append('g').attr('class', 'im-point-paths');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------


                defsEnter.append('clipPath')
                    .attr('id', 'im-edge-clip-' + id)
                    .append('rect');

                wrap.select('#im-edge-clip-' + id + ' rect')
                    .attr('width', availableWidth)
                    .attr('height', availableHeight);

                g   .attr('clip-path', clipEdge ? 'url(#im-edge-clip-' + id + ')' : '');


                function updateInteractiveLayer() {

                    if (!interactive) return false;

                    var eventElements;

                    var vertices = d3.merge(data.map(function(group, groupIndex) {
                        return group.values
                            .filter(pointActive) // remove non-interactive points
                            .map(function(point, pointIndex) {
                                // *Adding noise to make duplicates very unlikely
                                // **Injecting series and point index for reference
                                return [x(getX(point,pointIndex)) * (Math.random() / 1e12 + 1)  , y(getY(point,pointIndex)) * (Math.random() / 1e12 + 1), groupIndex, pointIndex]; //temp hack to add noise untill I think of a better way so there are no duplicates
                            })
                    })
                    );


                    if (clipVoronoi) {
                        defsEnter.append('clipPath').attr('id', 'im-points-clip-' + id);

                        var pointClips = wrap.select('#im-points-clip-' + id).selectAll('circle')
                            .data(vertices);
                        pointClips.enter().append('circle')
                            .attr('r', clipRadius);
                        pointClips.exit().remove();
                        pointClips
                            .attr('cx', function(d) { return d[0] })
                            .attr('cy', function(d) { return d[1] });

                        wrap.select('.im-point-paths')
                            .attr('clip-path', 'url(#im-points-clip-' + id + ')');
                    }


                    //inject series and point index for reference into voronoi
                    if (useVoronoi === true) {
                        var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
                            return {
                                'data': d,
                                'series': vertices[i][2],
                                'point': vertices[i][3]
                            }
                        });


                        var pointPaths = wrap.select('.im-point-paths').selectAll('path')
                            .data(voronoi);
                        pointPaths.enter().append('path')
                            .attr('class', function(d,i) { return 'im-path-'+i; });
                        pointPaths.exit().remove();
                        pointPaths
                            .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; });

                        eventElements = pointPaths;

                    } else {
                        // bring data in form needed for click handlers
                        var dataWithPoints = vertices.map(function(d, i) {
                            return {
                                'data': d,
                                'series': vertices[i][2],
                                'point': vertices[i][3]
                            }
                        });

                        // add event handlers to points instead voronoi paths
                        eventElements = wrap.select('.im-groups').selectAll('.im-group')
                            .selectAll('path.im-point')
                            .data(dataWithPoints)
                            .style('pointer-events', 'auto'); // recativate events, disabled by css
                    }

                    eventElements
                        .on('click', function(d) {
                        var series = data[d.series],
                            point  = series.values[d.point];

                        dispatch.elementClick({
                            point: point,
                            series: series,
                            pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                            seriesIndex: d.series,
                            pointIndex: d.point
                        });
                    })
                        .on('mouseover', function(d) {
                            var series = data[d.series],
                                point  = series.values[d.point];

                            dispatch.elementMouseover({
                                point: point,
                                series: series,
                                pos: [x(getX(point, d.point)) + margin.left, y(getY(point, d.point)) + margin.top],
                                seriesIndex: d.series,
                                pointIndex: d.point
                            });
                        })
                        .on('mouseout', function(d, i) {
                            var series = data[d.series],
                                point  = series.values[d.point];

                            dispatch.elementMouseout({
                                point: point,
                                series: series,
                                seriesIndex: d.series,
                                pointIndex: d.point
                            });
                        });

                }



                var groups = wrap.select('.im-groups').selectAll('.im-group')
                    .data(function(d) { return d }, function(d) { return d.key });
                groups.enter().append('g')
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6);
                d3.transition(groups.exit())
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6)
                    .remove();
                groups
                    .attr('class', function(d,i) { return 'im-group im-series-' + i })
                    .classed('hover', function(d) { return d.hover });
                d3.transition(groups)
                    .style('fill', function(d,i) { return color(d, i) })
                    .style('stroke', function(d,i) { return color(d, i) })
                    .style('stroke-opacity', 1)
                    .style('fill-opacity', .5);


                var points = groups.selectAll('path.im-point')
                    .data(function(d) { return d.values });
                points.enter().append('path')
                    .attr('transform', function(d,i) {
                        return 'translate(' + x0(getX(d,i)) + ',' + y0(getY(d,i)) + ')'
                    })
                    .attr('d',
                    d3.svg.symbol()
                        .type(getShape)
                        .size(function(d,i) { return z(getSize(d,i)) })
                );
                points.exit().remove();
                d3.transition(groups.exit().selectAll('path.im-point'))
                    .attr('transform', function(d,i) {
                        return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
                    })
                    .remove();
                points.attr('class', function(d,i) { return 'im-point im-point-' + i });
                d3.transition(points)
                    .attr('transform', function(d,i) {
                        return 'translate(' + x(getX(d,i)) + ',' + y(getY(d,i)) + ')'
                    })
                    .attr('d',
                    d3.svg.symbol()
                        .type(getShape)
                        .size(function(d,i) { return z(getSize(d,i)) })
                );


                // Delay updating the iimisible interactive layer for smoother animation
                clearTimeout(timeoutID); // stop repeat calls to updateInteractiveLayer
                timeoutID = setTimeout(updateInteractiveLayer, 1000);

                //store old scales for use in transitions on update
                x0 = x.copy();
                y0 = y.copy();
                z0 = z.copy();

            });

            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        dispatch.on('elementMouseover.point', function(d) {
            if (interactive)
                d3.select('.im-chart-' + id + ' .im-series-' + d.seriesIndex + ' .im-point-' + d.pointIndex)
                    .classed('hover', true);
        });

        dispatch.on('elementMouseout.point', function(d) {
            if (interactive)
                d3.select('.im-chart-' + id + ' .im-series-' + d.seriesIndex + ' .im-point-' + d.pointIndex)
                    .classed('hover', false);
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        chart.dispatch = dispatch;

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = d3.functor(_);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = d3.functor(_);
            return chart;
        };

        chart.size = function(_) {
            if (!arguments.length) return getSize;
            getSize = d3.functor(_);
            return chart;
        };

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.xScale = function(_) {
            if (!arguments.length) return x;
            x = _;
            return chart;
        };

        chart.yScale = function(_) {
            if (!arguments.length) return y;
            y = _;
            return chart;
        };

        chart.zScale = function(_) {
            if (!arguments.length) return z;
            z = _;
            return chart;
        };

        chart.xDomain = function(_) {
            if (!arguments.length) return xDomain;
            xDomain = _;
            return chart;
        };

        chart.yDomain = function(_) {
            if (!arguments.length) return yDomain;
            yDomain = _;
            return chart;
        };

        chart.sizeDomain = function(_) {
            if (!arguments.length) return sizeDomain;
            sizeDomain = _;
            return chart;
        };

        chart.sizeRange = function(_) {
            if (!arguments.length) return sizeRange;
            sizeRange = _;
            return chart;
        };

        chart.forceX = function(_) {
            if (!arguments.length) return forceX;
            forceX = _;
            return chart;
        };

        chart.forceY = function(_) {
            if (!arguments.length) return forceY;
            forceY = _;
            return chart;
        };

        chart.forceSize = function(_) {
            if (!arguments.length) return forceSize;
            forceSize = _;
            return chart;
        };

        chart.interactive = function(_) {
            if (!arguments.length) return interactive;
            interactive = _;
            return chart;
        };

        chart.pointActive = function(_) {
            if (!arguments.length) return pointActive;
            pointActive = _;
            return chart;
        };

        chart.clipEdge = function(_) {
            if (!arguments.length) return clipEdge;
            clipEdge = _;
            return chart;
        };

        chart.clipVoronoi= function(_) {
            if (!arguments.length) return clipVoronoi;
            clipVoronoi = _;
            return chart;
        };

        chart.useVoronoi= function(_) {
            if (!arguments.length) return useVoronoi;
            useVoronoi = _;
            if (useVoronoi === false) {
                clipVoronoi = false;
            }
            return chart;
        };

        chart.clipRadius = function(_) {
            if (!arguments.length) return clipRadius;
            clipRadius = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            return chart;
        };

        chart.shape = function(_) {
            if (!arguments.length) return getShape;
            getShape = _;
            return chart;
        };

        chart.id = function(_) {
            if (!arguments.length) return id;
            id = _;
            return chart;
        };

        chart.singlePoint = function(_) {
            if (!arguments.length) return singlePoint;
            singlePoint = _;
            return chart;
        };

        //============================================================


        return chart;
    }



    im3.models.line = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var margin = {top: 0, right: 0, bottom: 0, left: 0}
            , width = 960
            , height = 500
            , color = im3.utils.defaultColor() // a function that returns a color
            , id = Math.floor(Math.random() * 10000) //Create semi-unique ID incase user doesn't select one
            , getX = function(d) { return d.x } // accessor to get the x value from a data point
            , getY = function(d) { return d.y } // accessor to get the y value from a data point
            , defined = function(d,i) { return !isNaN(getY(d,i)) && getY(d,i) !== null } // allows a line to be not continous when it is not defined
            , isArea = function(d) { return d.area } // decides if a line is an area or just a line
            , clipEdge = false // if true, masks lines within x and y scale
            , x //can be accessed via chart.xScale()
            , y //can be accessed via chart.yScale()
            , interpolate = "linear" // controls the line interpolation
            , scatter = im3.models.scatter()
            ;

        scatter
            .id(id)
            .size(16) // default size
            .sizeDomain([16,256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var x0, y0 //used to store previous scales
            ;

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var availableWidth = width - margin.left - margin.right,
                    availableHeight = height - margin.top - margin.bottom,
                    container = d3.select(this);

                //------------------------------------------------------------
                // Setup Scales

                x = scatter.xScale();
                y = scatter.yScale();

                x0 = x0 || x;
                y0 = y0 || y;

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-line').data([data]);
                var wrapEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-line');
                var defsEnter = wrapEnter.append('defs');
                var gEnter = wrapEnter.append('g');
                var g = wrap.select('g')

                gEnter.append('g').attr('class', 'im-groups');
                gEnter.append('g').attr('class', 'im-scatterWrap');

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                //------------------------------------------------------------




                scatter
                    .width(availableWidth)
                    .height(availableHeight)

                var scatterWrap = wrap.select('.im-scatterWrap');
                //.datum(data); // Data automatically trickles down from the wrap

                d3.transition(scatterWrap).call(scatter);



                defsEnter.append('clipPath')
                    .attr('id', 'im-edge-clip-' + id)
                    .append('rect');

                wrap.select('#im-edge-clip-' + id + ' rect')
                    .attr('width', availableWidth)
                    .attr('height', availableHeight);

                g   .attr('clip-path', clipEdge ? 'url(#im-edge-clip-' + id + ')' : '');
                scatterWrap
                    .attr('clip-path', clipEdge ? 'url(#im-edge-clip-' + id + ')' : '');




                var groups = wrap.select('.im-groups').selectAll('.im-group')
                    .data(function(d) { return d }, function(d) { return d.key });
                groups.enter().append('g')
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6);
                d3.transition(groups.exit())
                    .style('stroke-opacity', 1e-6)
                    .style('fill-opacity', 1e-6)
                    .remove();
                groups
                    .attr('class', function(d,i) { return 'im-group im-series-' + i })
                    .classed('hover', function(d) { return d.hover })
                    .style('fill', function(d,i){ return color(d, i) })
                    .style('stroke', function(d,i){ return color(d, i)});
                d3.transition(groups)
                    .style('stroke-opacity', 1)
                    .style('fill-opacity', .5);



                var areaPaths = groups.selectAll('path.im-area')
                    .data(function(d) { return [d] }); // this is done differently than lines because I need to check if series is an area
                areaPaths.enter().append('path')
                    .filter(isArea)
                    .attr('class', 'im-area')
                    .attr('d', function(d) {
                        return d3.svg.area()
                            .interpolate(interpolate)
                            .defined(defined)
                            .x(function(d,i) { return x0(getX(d,i)) })
                            .y0(function(d,i) { return y0(getY(d,i)) })
                            .y1(function(d,i) { return y0( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
                            //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                            .apply(this, [d.values])
                    });
                d3.transition(groups.exit().selectAll('path.im-area'))
                    .attr('d', function(d) {
                        return d3.svg.area()
                            .interpolate(interpolate)
                            .defined(defined)
                            .x(function(d,i) { return x0(getX(d,i)) })
                            .y0(function(d,i) { return y0(getY(d,i)) })
                            .y1(function(d,i) { return y0( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
                            //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                            .apply(this, [d.values])
                    });
                d3.transition(areaPaths.filter(isArea))
                    .attr('d', function(d) {
                        return d3.svg.area()
                            .interpolate(interpolate)
                            .defined(defined)
                            .x(function(d,i) { return x0(getX(d,i)) })
                            .y0(function(d,i) { return y0(getY(d,i)) })
                            .y1(function(d,i) { return y0( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
                            //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
                            .apply(this, [d.values])
                    });



                var linePaths = groups.selectAll('path.im-line')
                    .data(function(d) { return [d.values] });
                linePaths.enter().append('path')
                    .attr('class', function(d) { return 'im-line' })
                    .attr('d',
                    d3.svg.line()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return x0(getX(d,i)) })
                        .y(function(d,i) { return y0(getY(d,i)) })
                );
                d3.transition(groups.exit().selectAll('path.im-line'))
                    .attr('d',
                    d3.svg.line()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return x(getX(d,i)) })
                        .y(function(d,i) { return y(getY(d,i)) })
                );
                d3.transition(linePaths)
                    .attr('d',
                    d3.svg.line()
                        .interpolate(interpolate)
                        .defined(defined)
                        .x(function(d,i) { return x(getX(d,i)) })
                        .y(function(d,i) { return y(getY(d,i)) })
                );



                //store old scales for use in transitions on update
                x0 = x.copy();
                y0 = y.copy();

            });

            return chart;
        }


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        chart.dispatch = scatter.dispatch;
        chart.scatter = scatter;

        d3.rebind(chart, scatter, 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'clipRadius');

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.x = function(_) {
            if (!arguments.length) return getX;
            getX = _;
            scatter.x(_);
            return chart;
        };

        chart.y = function(_) {
            if (!arguments.length) return getY;
            getY = _;
            scatter.y(_);
            return chart;
        };

        chart.clipEdge = function(_) {
            if (!arguments.length) return clipEdge;
            clipEdge = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            scatter.color(color);
            return chart;
        };

        chart.id = function(_) {
            if (!arguments.length) return id;
            id = _;
            return chart;
        };

        chart.interpolate = function(_) {
            if (!arguments.length) return interpolate;
            interpolate = _;
            return chart;
        };

        chart.defined = function(_) {
            if (!arguments.length) return defined;
            defined = _;
            return chart;
        };

        chart.isArea = function(_) {
            if (!arguments.length) return isArea;
            isArea = d3.functor(_);
            return chart;
        };

        //============================================================


        return chart;
    }



    im3.models.lineChart = function() {

        //============================================================
        // Public Variables with Default Settings
        //------------------------------------------------------------

        var lines = im3.models.line()
            , xAxis = im3.models.axis()
            , yAxis = im3.models.axis()
            , legend = im3.models.legend()
            ;

        var margin = {top: 30, right: 20, bottom: 50, left: 60}
            , color = im3.utils.defaultColor()
            , width = null
            , height = null
            , showLegend = true
            , tooltips = true
            , tooltip = function(key, x, y, e, graph) {
                return '<h3>' + key + '</h3>' +
                    '<p>' +  y + ' at ' + x + '</p>'
            }
            , x
            , y
            , noData = 'No Data Available.'
            , dispatch = d3.dispatch('tooltipShow', 'tooltipHide')
            ;

        xAxis
            .orient('bottom')
            .tickPadding(5)
        ;
        yAxis
            .orient('left')
        ;

        //============================================================


        //============================================================
        // Private Variables
        //------------------------------------------------------------

        var showTooltip = function(e, offsetElement) {

            // New addition to calculate position if SVG is scaled with viewBox, may move TODO: consider implementing everywhere else
            if (offsetElement) {
                var svg = d3.select(offsetElement).select('svg');
                var viewBox = svg.attr('viewBox');
                if (viewBox) {
                    viewBox = viewBox.split(' ');
                    var ratio = parseInt(svg.style('width')) / viewBox[2];
                    e.pos[0] = e.pos[0] * ratio;
                    e.pos[1] = e.pos[1] * ratio;
                }
            }

            var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
                top = e.pos[1] + ( offsetElement.offsetTop || 0),
                x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
                y = yAxis.tickFormat()(lines.y()(e.point, e.pointIndex)),
                content = tooltip(e.series.key, x, y, e, chart);

            im3.tooltip.show([left, top], content, null, null, offsetElement);
        };

        //============================================================


        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this),
                    that = this;

                var availableWidth = (width  || parseInt(container.style('width')) || 960)
                        - margin.left - margin.right,
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                        - margin.top - margin.bottom;


                chart.update = function() { chart(selection) };
                chart.container = this;


                //------------------------------------------------------------
                // Display noData message if there's nothing to show.

                if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                    var noDataText = container.selectAll('.im-noData').data([noData]);

                    noDataText.enter().append('text')
                        .attr('class', 'im3 im-noData')
                        .attr('dy', '-.7em')
                        .style('text-anchor', 'middle');

                    noDataText
                        .attr('x', margin.left + availableWidth / 2)
                        .attr('y', margin.top + availableHeight / 2)
                        .text(function(d) { return d });

                    return chart;
                } else {
                    container.selectAll('.im-noData').remove();
                }

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Scales

                x = lines.xScale();
                y = lines.yScale();

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup containers and skeleton of chart

                var wrap = container.selectAll('g.im-wrap.im-lineChart').data([data]);
                var gEnter = wrap.enter().append('g').attr('class', 'im3 im-wrap im-lineChart').append('g');
                var g = wrap.select('g');

                gEnter.append('g').attr('class', 'im-x im-axis');
                gEnter.append('g').attr('class', 'im-y im-axis');
                gEnter.append('g').attr('class', 'im-linesWrap');
                gEnter.append('g').attr('class', 'im-legendWrap');

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Legend

                if (showLegend) {
                    legend.width(availableWidth);

                    g.select('.im-legendWrap')
                        .datum(data)
                        .call(legend);

                    if ( margin.top != legend.height()) {
                        margin.top = legend.height();
                        availableHeight = (height || parseInt(container.style('height')) || 400)
                            - margin.top - margin.bottom;
                    }

                    wrap.select('.im-legendWrap')
                        .attr('transform', 'translate(0,' + (-margin.top) +')')
                }

                //------------------------------------------------------------

                wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


                //------------------------------------------------------------
                // Main Chart Component(s)

                lines
                    .width(availableWidth)
                    .height(availableHeight)
                    .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled }));


                var linesWrap = g.select('.im-linesWrap')
                    .datum(data.filter(function(d) { return !d.disabled }))

                d3.transition(linesWrap).call(lines);

                //------------------------------------------------------------


                //------------------------------------------------------------
                // Setup Axes

                xAxis
                    .scale(x)
                    .ticks( availableWidth / 100 )
                    .tickSize(-availableHeight, 0);

                g.select('.im-x.im-axis')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')');
                d3.transition(g.select('.im-x.im-axis'))
                    .call(xAxis);


                yAxis
                    .scale(y)
                    .ticks( availableHeight / 36 )
                    .tickSize( -availableWidth, 0);

                d3.transition(g.select('.im-y.im-axis'))
                    .call(yAxis);

                //------------------------------------------------------------


                //============================================================
                // Event Handling/Dispatching (in chart's scope)
                //------------------------------------------------------------

                legend.dispatch.on('legendClick', function(d,i) {
                    d.disabled = !d.disabled;

                    if (!data.filter(function(d) { return !d.disabled }).length) {
                        data.map(function(d) {
                            d.disabled = false;
                            wrap.selectAll('.im-series').classed('disabled', false);
                            return d;
                        });
                    }

                    selection.transition().call(chart);
                });

                /*
                 legend.dispatch.on('legendMouseover', function(d, i) {
                 d.hover = true;
                 selection.transition().call(chart)
                 });

                 legend.dispatch.on('legendMouseout', function(d, i) {
                 d.hover = false;
                 selection.transition().call(chart)
                 });
                 */

                dispatch.on('tooltipShow', function(e) {
                    if (tooltips) showTooltip(e, that.parentNode);
                });

                //============================================================

            });

            return chart;
        }


        //============================================================
        // Event Handling/Dispatching (out of chart's scope)
        //------------------------------------------------------------

        lines.dispatch.on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
            dispatch.tooltipShow(e);
        });

        lines.dispatch.on('elementMouseout.tooltip', function(e) {
            dispatch.tooltipHide(e);
        });

        dispatch.on('tooltipHide', function() {
            if (tooltips) im3.tooltip.cleanup();
        });

        //============================================================


        //============================================================
        // Expose Public Variables
        //------------------------------------------------------------

        // expose chart's sub-components
        chart.dispatch = dispatch;
        chart.lines = lines;
        chart.legend = legend;
        chart.xAxis = xAxis;
        chart.yAxis = yAxis;

        d3.rebind(chart, lines, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id', 'interpolate');

        chart.margin = function(_) {
            if (!arguments.length) return margin;
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
            return chart;
        };

        chart.width = function(_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function(_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        };

        chart.color = function(_) {
            if (!arguments.length) return color;
            color = im3.utils.getColor(_);
            legend.color(color);
            return chart;
        };

        chart.showLegend = function(_) {
            if (!arguments.length) return showLegend;
            showLegend = _;
            return chart;
        };

        chart.tooltips = function(_) {
            if (!arguments.length) return tooltips;
            tooltips = _;
            return chart;
        };

        chart.tooltipContent = function(_) {
            if (!arguments.length) return tooltip;
            tooltip = _;
            return chart;
        };

        chart.noData = function(_) {
            if (!arguments.length) return noData;
            noData = _;
            return chart;
        };

        //============================================================


        return chart;
    }


    var noDataMessage=function(){
        return "没有可加载的数据";
    }
})();



