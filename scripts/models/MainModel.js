///<reference path='../typings/knockout/knockout.d.ts' />
///<reference path='../typings/jquery/jquery.d.ts' />
///<reference path='../typings/jqueryui/jqueryui.d.ts' />
///<reference path='../typings/googlemaps/google.maps.d.ts' />
///<reference path='../typings/highcharts/highcharts.d.ts' />
var models;
(function (models) {
    var MainModel = (function () {
        function MainModel(host) {
            this.bubbles = [];
            this.windows = [];
            this.ctaLayer = null;
            this.kmlValue = ko.observable('');
            this.indicatorStyleValue = ko.observable('bubble');
            this.chartIndicatorValue = ko.observable('account');
            this.bubbleIndicatorValue = ko.observable('19');
            this.isChartSelectorVisible = ko.observable(false);
            this.isLegendVisible = ko.observable(false);
            this.countries = ko.observableArray([]);
            this.countriesAndRegions = ko.observableArray([]);
            this.isExpanded = ko.observable(true);
            this.selectedValues = ko.observableArray();
            this.summaryType = ko.observable('summary');
            this.linkText = ko.observable('Show link to this page');
            this.isLinkVisible = ko.observable(false);
            var _this = this;
            _this.host = host;
            var countryParams = [_this.getUrlParameter('country1'), _this.getUrlParameter('country2'), _this.getUrlParameter('country3')];

            var mapOptions = {
                zoom: 4,
                center: new google.maps.LatLng(57.028774, 19.068832),
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                streetViewControl: false,
                panControl: false,
                zoomControlOptions: { style: google.maps.ZoomControlStyle.SMALL },
                mapTypeControl: false,
                scrollwheel: false
            };

            _this.map = new google.maps.Map($('#map-canvas')[0], mapOptions);

            google.maps.event.addListener(_this.map, 'zoom_changed', function () {
                _this.zoomChanged(_this.map);
            });

            _this.getKml();
            _this.initiateBubbles(_this);
            _this.showBubbles(this.map.getZoom(), this.map);

            for (var i = 0; i < models.MsmeData.rows.length; i++) {
                var c = new models.SummaryItem(models.MsmeData.rows[i], models.CountryIndicatorData.rows[models.MsmeData.rows[i][1]], 'country');
                _this.countries.push(c);
                _this.countriesAndRegions.push(c);
            }
            _this.countries.sort(function (left, right) {
                return left.Name == right.Name ? 0 : (left.Name < right.Name ? -1 : 1);
            });
            _this.countriesAndRegions.sort(function (left, right) {
                return left.Name == right.Name ? 0 : (left.Name < right.Name ? -1 : 1);
            });
            for (var i = 0; i < models.MsmeRegionData.rows.length; i++) {
                var c = new models.SummaryItem(models.MsmeRegionData.rows[i], null, 'region');
                _this.countriesAndRegions.push(c);
            }

            _this.countriesAndRegions.push(new models.SummaryItem(models.MsmeDevelopingData.rows, models.CountryIndicatorData.developmentCountries, 'development'));

            $('#scrollablePart').height($(window).height() - 160);
            _this.summaryDialog = $('#summary').dialog({
                autoOpen: false,
                modal: true,
                height: $(window).height() - 100,
                width: 1400,
                dialogClass: 'noTitleDialog'
            });

            _this.createCharts(_this);

            for (var i = 0; i < 3; i++) {
                this.selectedValues.push(ko.observable(new models.SummaryItem(null, null, 'empty')));
            }

            if (countryParams[0] != "null") {
                _this.showInitSummaryDialog(_this, null, countryParams[0], countryParams[1], countryParams[2]);
            }

            _this.shortPanelText = ko.computed(function () {
                var b = _this.bubbleIndicatorValue();
                var c = _this.chartIndicatorValue();
                var k = _this.kmlValue();
                return '<strong>Layer:</strong> ' + $('#colorIndicator option:selected').text() + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>Indicator:</strong>' + (!_this.isChartSelectorVisible() ? $('#bubbleIndicator option:selected').text() : $('#chartIndicator option:selected').text());
            });

            _this.link = ko.computed(function () {
                return _this.host + '?country1=' + encodeURIComponent(_this.selectedValues()[0]().Name) + '&country2=' + encodeURIComponent(_this.selectedValues()[1]().Name) + '&country3=' + encodeURIComponent(_this.selectedValues()[2]().Name);
            });
        }
        MainModel.prototype.getUrlParameter = function (name) {
            return decodeURI((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]);
        };

        MainModel.prototype.showLink = function (data) {
            if (data.isLinkVisible()) {
                data.linkText('Show link to this page');
            } else {
                data.linkText('Hide');
            }
            data.isLinkVisible(!data.isLinkVisible());
        };

        MainModel.prototype.closeSummary = function (data) {
            data.summaryDialog.dialog('close');
        };

        MainModel.prototype.createCharts = function (data) {
            $('#accountChart').highcharts({
                chart: { type: 'column' },
                colors: ['#762A83', '#9970AB', '#C2A5CF'],
                title: { text: 'Access' },
                xAxis: { categories: ['Have Checking', 'Have Overdraft', 'Have Loan', 'Have Access to Credit'] },
                yAxis: { title: { text: "%" } },
                series: [{ name: "item1", data: [] }, { name: "item2", data: [] }, { name: "item3", data: [] }],
                credits: { enabled: false },
                tooltip: { valueSuffix: "%" }
            });

            data.accChart = $('#accountChart').highcharts();

            $('#serviceChart').highcharts({
                chart: { type: 'column' },
                colors: ['#762A83', '#9970AB', '#C2A5CF'],
                title: { text: 'How well served?' },
                xAxis: {
                    categories: ['Does not need credit', 'Unserved', 'Underserved', 'Well served']
                },
                yAxis: { title: { text: "%" } },
                series: [{ name: "item1", data: [] }, { name: "item2", data: [] }, { name: "item3", data: [] }],
                credits: { enabled: false },
                tooltip: { valueSuffix: "%" }
            });

            data.srvChart = $('#serviceChart').highcharts();

            $('#sourceChart').highcharts({
                chart: { type: 'column' },
                colors: ['#762A83', '#9970AB', '#C2A5CF'],
                title: { text: 'Source of Financing' },
                xAxis: {
                    categories: ['Private Commercial Bank', 'State-owned Bank and/or Govt. Agency', 'Non-bank Financial Institution', 'Other']
                },
                yAxis: { title: { text: "%" } },
                series: [{ name: "item1", data: [] }, { name: "item2", data: [] }, { name: "item3", data: [] }],
                credits: { enabled: false },
                tooltip: { valueSuffix: "%" }
            });

            data.srcChart = $('#sourceChart').highcharts();
        };

        MainModel.prototype.changeSelectedCountry = function (data, event) {
            data.selectedValues()[0]().updateCharts(data.accChart.series[0], data.srvChart.series[0], data.srcChart.series[0]);
            data.selectedValues()[1]().updateCharts(data.accChart.series[1], data.srvChart.series[1], data.srcChart.series[1]);
            data.selectedValues()[2]().updateCharts(data.accChart.series[2], data.srvChart.series[2], data.srcChart.series[2]);
            data.accChart.redraw();
            data.srvChart.redraw();
            data.srcChart.redraw();
        };

        MainModel.prototype.onCountryChange = function (data, event) {
            if (data.summaryType() == 'summary') {
                var c = null, d = null;
                var regionName = models.CountryRegionMap.map[data.selectedValues()[0]().Name];
                for (var i = 0; i < data.countriesAndRegions().length; i++) {
                    var r = data.countriesAndRegions()[i];
                    if (r.Name == regionName) {
                        data.selectedValues()[1](r);
                    }
                    if (r.Name == 'Developing Countries') {
                        data.selectedValues()[2](r);
                    }
                    if (r.type == 'region' || r.type == 'development') {
                        data.countries.remove(r);
                    }
                }
            } else {
                for (var i = 0; i < data.countriesAndRegions().length; i++) {
                    var r = data.countriesAndRegions()[i];
                    if (r.type == 'region' || r.type == 'development') {
                        data.countries.push(r);
                    }
                }
            }

            data.changeSelectedCountry(data, event);
            return true;
        };

        MainModel.prototype.showSummaryDialog = function (data, event, country) {
            if (country != undefined) {
                var c = $.grep(data.countries(), function (e, i) {
                    return e.Name == country;
                });
                if (c.length > 0) {
                    data.selectedValues()[0](c[0]);
                }
            } else {
                data.selectedValues()[0](data.countries()[0]);
            }
            data.summaryType('summary');
            data.onCountryChange(data, event);
            data.summaryDialog.dialog("open");
        };

        MainModel.prototype.showInitSummaryDialog = function (data, event, country1, country2, country3) {
            var c1 = $.grep(data.countriesAndRegions(), function (e, i) {
                return e.Name == country1;
            });
            var c2 = $.grep(data.countriesAndRegions(), function (e, i) {
                return e.Name == country2;
            });
            var c3 = $.grep(data.countriesAndRegions(), function (e, i) {
                return e.Name == country3;
            });
            data.selectedValues()[0](c1[0]);
            data.selectedValues()[1](c2[0]);
            data.selectedValues()[2](c3[0]);
            data.summaryType('compare');
            data.onCountryChange(data, event);
            data.summaryDialog.dialog("open");
        };

        MainModel.prototype.showSelectors = function () {
            this.isChartSelectorVisible(this.indicatorStyleValue() == "chart");

            if (this.map.getZoom() > 3) {
                this.showBubbles(this.map.getZoom(), this.map);
            }
        };

        MainModel.prototype.showLegend = function () {
            $('div[id*="legend"]').hide();
            var val = this.chartIndicatorValue();
            $('div[id="legend' + val + '"]').show();
        };

        MainModel.prototype.expandMenu = function (data) {
            data.isExpanded(!data.isExpanded());
        };

        MainModel.prototype.showBubbles = function (zoom, map) {
            //var selector = $('#bubbleIndicator');
            var id = this.bubbleIndicatorValue();
            var alpha = {
                "19": 50 / 1000000000000,
                "5": 50 / 100000000,
                "12": 50 / 200,
                "13": 50 / 200
            };
            var isBubble = (this.indicatorStyleValue() == "bubble");
            var chartData = this.chartIndicatorValue();
            for (var i = 0; i < this.bubbles.length; i++) {
                var bubble = this.bubbles[i];

                if (isBubble) {
                    bubble.setIcon({
                        path: google.maps.SymbolPath.CIRCLE,
                        fillOpacity: 1,
                        fillColor: '#AF8DC3',
                        strokeOpacity: 0,
                        scale: alpha[id] * parseInt(bubble.data[id]) + (zoom - 3) * 4
                    });
                } else {
                    var sizeId = -1;
                    switch (chartData) {
                        case "account":
                            sizeId = 21;
                            break;
                        case "served":
                            sizeId = 23;
                            break;
                        case "source":
                            sizeId = 25;
                            break;
                    }
                    bubble.setIcon({
                        url: this.host + "images/" + chartData + "/" + bubble.data[1] + ".png",
                        scaledSize: new google.maps.Size(bubble.data[sizeId - 1] / 4 * (zoom - 3), bubble.data[sizeId] / 4 * (zoom - 3))
                    });
                }
                bubble.setMap(map);
            }
        };

        MainModel.prototype.hideBubbles = function () {
            for (var i = 0; i < this.bubbles.length; i++) {
                var bubble = this.bubbles[i];
                bubble.setMap(null);
            }
        };

        MainModel.prototype.zoomChanged = function (map) {
            var zoomLevel = map.getZoom();
            if (zoomLevel > 3) {
                this.showBubbles(zoomLevel, map);
            } else {
                this.hideBubbles();
            }
        };

        MainModel.prototype.getKml = function () {
            if (this.ctaLayer != null) {
                this.ctaLayer.setMap(null);
            }

            if (this.kmlValue() != '') {
                this.ctaLayer = new google.maps.KmlLayer(this.host + "indicators/" + this.kmlValue(), {
                    preserveViewport: true,
                    screenOverlays: this.isLegendVisible()
                });
                this.ctaLayer.setMap(this.map);
            }

            return true;
        };

        MainModel.prototype.numberWithCommas = function (x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        MainModel.prototype.initiateBubbles = function (main) {
            if (this.bubbles.length == 0) {
                for (var i = 0; i < models.MsmeData.rows.length; i++) {
                    (function (i) {
                        var info = models.MsmeData.rows[i];
                        var bubble = new google.maps.Marker({
                            position: new google.maps.LatLng(info[2], info[3]),
                            data: info
                        });

                        var str = "<h2>" + info[0] + "</h2><a href='#' id='link" + info[1] + "' data-bind='click : function(data, event) { showSummaryDialog(data, event, \"" + info[0] + "\") }'>Show Summary</a><table>";

                        //console.log(info[0] + ":" + models.CountryRegionMap.map[info[0]]);
                        var rowNum = 1;
                        if (info[5] != null) {
                            str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td><strong>#MSMEs</strong></td><td style='text-align:right'>" + main.numberWithCommas(info[5]) + "</td></tr>";
                        }
                        if (info[10] != null) {
                            str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td><strong>A2F as major/severe barrier</strong></td><td style='text-align:right'>" + main.numberWithCommas(info[10]) + "</td></tr>";
                        }
                        if ((info[6] != null) || (info[7] != null) || (info[8] != null) || (info[9] != null)) {
                            str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td colspan=2><strong>Access</strong></td></tr>";
                            if (info[6] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Have Checking</strong></td><td style='text-align:right'>" + info[6] + "</td></tr>";
                            }
                            if (info[7] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Have Overdraft</strong></td><td style='text-align:right'>" + info[7] + "</td></tr>";
                            }
                            if (info[8] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Have Loan</strong></td><td style='text-align:right'>" + info[8] + "</td></tr>";
                            }
                            if (info[9] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Have Access to Credit</strong></td><td style='text-align:right'>" + info[9] + "</td></tr>";
                            }
                        }
                        if ((info[11] != null) || (info[12] != null) || (info[13] != null) || (info[14] != null)) {
                            str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td colspan=2><strong>How well served?</strong></td></tr>";
                            if (info[11] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Does not need credit %</strong></td><td style='text-align:right'>" + info[11] + "</td></tr>";
                            }
                            if (info[12] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Unserved %</strong></td><td style='text-align:right'>" + info[12] + "</td></tr>";
                            }
                            if (info[13] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Underserved %</strong></td><td style='text-align:right'>" + info[13] + "</td></tr>";
                            }
                            if (info[14] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Well served %</strong></td><td style='text-align:right'>" + info[14] + "</td></tr>";
                            }
                        }
                        if ((info[15] != null) || (info[16] != null) || (info[17] != null) || (info[18] != null)) {
                            str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td colspan=2><strong>Source of Financing</strong></td></tr>";
                            if (info[15] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Private Commercial Bank as Source of Financing</strong></td><td style='text-align:right'>" + info[15] + "</td></tr>";
                            }
                            if (info[16] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>State-owned Bank and/or Govt. Agency as Source of Financing</strong></td><td style='text-align:right'>" + info[16] + "</td></tr>";
                            }
                            if (info[17] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Non-bank Financial Institution as Source of Financing</strong></td><td style='text-align:right'>" + info[17] + "</td></tr>";
                            }
                            if (info[18] != null) {
                                str += "<tr class='" + ((rowNum++) % 2 == 1 ? "odd" : "even") + "' ><td class='shift'><strong>Other Source of Financing</strong></td><td style='text-align:right'>" + info[18] + "</td></tr>";
                            }
                        }
                        str += "</table>";

                        var infowindow = new google.maps.InfoWindow({
                            content: str
                        });

                        google.maps.event.addListener(bubble, 'click', function () {
                            for (var j = 0; j < main.windows.length; j++) {
                                main.windows[j].close();
                            }
                            main.windows[i].open(main.map, main.bubbles[i]);
                        });

                        google.maps.event.addListener(infowindow, 'domready', function () {
                            ko.applyBindings(main, $("#link" + info[1])[0]);
                        });

                        main.bubbles.push(bubble);
                        main.windows.push(infowindow);
                    })(i);
                }
            }
        };
        return MainModel;
    })();
    models.MainModel = MainModel;
})(models || (models = {}));
