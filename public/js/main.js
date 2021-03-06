(function(window, $, angular, $access_token, undefined) {


// Init Angular App
//
var app = angular.module('horoscope-app', []);


// Set Default Values
//
app.run(function($rootScope, $q) {

  $rootScope.options = {
    gender:   'both',
    barSort:  'count',
    sunburst: 'genders'
  };

  var getData = $q.defer();
  $rootScope.gotData = getData.promise;

  d3.json('/console.json', function(error, json) {
  // d3.json('/get_friends_data.pl?access_token=' + $access_token, function(error, json) {
    getData.resolve(json);
  });

});


// Count horoscope frequencies for each gender group
//
app.factory('countHoroscopes', function() {
  return function(rawData) {
    var both = [], male = [], female = [], unknown = [];
    var data, gender;
    for (var i = rawData.length - 1; i >= 0; i--) {
      data = _.find(both, {name: rawData[i].zodiac_name});
      if (data) {
        data.count++;
      } else {
        both.push({name: rawData[i].zodiac_name, count: 1});
      }
      switch (rawData[i].gender) {
        case 'male':
          gender = male;
          break;
        case 'female':
          gender = female;
          break;
        default:
          gender = unknown;
          break;
      }
      data = _.find(gender, {name: rawData[i].zodiac_name});
      if (data) {
        data.count++;
      } else {
        gender.push({name: rawData[i].zodiac_name, count: 1});
      }
    };
    return {both: both, male: male, female: female, unknown: unknown};
  };
});


// Draw bar chart
app.directive('horoscopeCountBarChart', function($rootScope) {
  return {
    controller: function($scope, $element, countHoroscopes, getZodiacOrder) {

      var margin = {top: 20, right: 30, bottom: 30, left: 40},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

      var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .2);

      var y = d3.scale.linear()
        .range([height, 0]);

      var chart = d3.select($element[0])
        .attr("width" , width  + margin.left + margin.right)
        .attr("height", height + margin.top  + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

      var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

      chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")");

      chart.append("g")
        .attr("class", "y axis");


      // Query Data
      //
      $scope.gotData.then(function(json) {
        $scope.horoscopesCount = countHoroscopes(json['friends']['data']);
        $scope.$watch('options.gender', determineChartGender);
        $scope.$watch('options.barSort', function() {
          determineChartGender($scope.options.gender);
        });
      });


      function determineChartGender(gender) {
        drawChart($scope.horoscopesCount[gender]);
      }


      function drawChart(data) {

        x.domain(data.map(function(d) { return d.name }));

        var x0 = x.domain(
          data
          .sort(function(a, b) {
            if ($scope.options.barSort === 'count') {
              return b.count - a.count;
            } else {
              return getZodiacOrder(a.name) - getZodiacOrder(b.name);
            }
          })
          .map(function(d) { return d.name; })
        ).copy();

        y.domain([0, d3.max(data, function(d) { return d.count; })]);

        chart.select("g.x.axis").call(xAxis);

        var bars = chart.selectAll(".bar")
          .data(data, function(d) { return d.name; });

        bars.transition().duration(400)
          .attr("y", function(d) { return y(d.count); })
          .attr("height", function(d) { return height - y(d.count); })
          .delay(function(d, i) { return i * 200; })
          .attr("fill", function() {
            switch ($scope.options.gender) {
              case 'both':   return '#656D78';
              case 'male':   return '#4A89DC';
              case 'female': return '#D770AD';
            }
          })
          .attr("x", function(d) { return x0(d.name); });

        bars.enter().append("rect")
          .attr("y", height)
          .attr("height", 0)
          .attr("fill", function() {
            switch ($scope.options.gender) {
              case 'both':   return '#656D78';
              case 'male':   return '#4A89DC';
              case 'female': return '#D770AD';
            }
          })
          .attr("x", function(d) { return x0(d.name); })
          .transition().duration(1500)
          .attr("y", function(d) { return y(d.count); })
          .attr("height", function(d) { return height - y(d.count); });

        bars.exit()
        .transition().duration(500)
        .attr("y", height)
        .attr("height", 0)
        .remove();

        bars.attr("class", "bar")
        .attr("width", x.rangeBand());

        var transition = chart.transition().duration(500);
        transition.select("g.y.axis").call(yAxis);
        transition.select("g.x.axis").call(xAxis);
      }

    }, // END controller function
    link: function(scope, element, attrs) {

    } // END link function
  } // END return {}
}); // END directive horoscopeCountBarChart


// Count for All Groups such as male and female
//
app.factory('countAllGroups', function(countHoroscopes) {

  function sumCounts(array) {
    var sum = 0;
    for (var i = array.length - 1; i >= 0; i--) {
      sum += array[i].count;
    };
    return sum;
  }

  return function(rawData) {
    var data = countHoroscopes(rawData);
    var results = {
      genders:    {name: "by genders"   , children: []},
      horoscopes: {name: "by horoscopes", children: []}
    };
    for (var gender in data) {
      if (gender != 'both') {
        results['genders']['children'].push({
          name: gender, children: data[gender]
        });
      }
    }
    for (var i = data['both'].length - 1; i >= 0; i--) {
      var name    = data['both'][i]['name'];
      var male    = _.find(data['male']    , {name: name});
      var female  = _.find(data['female']  , {name: name});
      var unknown = _.find(data['unknown'] , {name: name});
      var child = {
        name: name,
        children: [
          {name: 'male'   , count: (male    ? male.count    : 0)},
          {name: 'female' , count: (female  ? female.count  : 0)},
          {name: 'unknown', count: (unknown ? unknown.count : 0)}
        ]
      };
      results['horoscopes']['children'].push(child)
    };
    return results;
  };
}); // END factory summarizeData


// Sunburst chart
//
app.directive('sunburstChart', function() {
  return {
    controller: function($scope, $element, countAllGroups, getZodiacOrder, hexColor) {

      var width = 960, height = 500, radius = Math.min(width, height) / 2;

      var color = d3.scale.category20();

      var svg = d3.select($element[0])
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

      var partition = d3.layout.partition()
        .sort(function(a, b) {
          return getZodiacOrder(a.name) - getZodiacOrder(b.name);
        })
        .size([2 * Math.PI, radius * radius])
        .value(function(d) { return d.count; });

      var arc = d3.svg.arc()
        .startAngle(function(d) { return d.x; })
        .endAngle(function(d) { return d.x + d.dx; })
        .innerRadius(function(d) { return Math.sqrt(d.y); })
        .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });


      $scope.gotData.then(function(json) {
        $scope.groupsCounts = countAllGroups(json['friends']['data']);
        $scope.$watch('options.sunburst', determineChartBase);
      });


      function determineChartBase(type) {
        drawChart($scope.groupsCounts[type]);
      }

      function drawChart(data) {
        var path = svg.datum(data).selectAll("path")
          .data(partition.nodes);

        // updates
        path.transition()
          .duration(1500)
          .style("fill", function(d) { return hexColor(d.name); })
          .attrTween("d", function(a) {
            var __test__ = this.__test__;
            var i = d3.interpolate({x: __test__.x0, dx: __test__.dx0}, a);
            return function(t) {
              var b = i(t);
              __test__.x0  = b.x;
              __test__.dx0 = b.dx;
              return arc(b);
            };
          });

        // enter
        path.enter().append('path')
          .style("fill", function(d) { return hexColor(d.name); })
          .transition()
          .duration(1500)
          .attrTween("d", function(a) {
            var __test__ = this.__test__ = {};
            var i = d3.interpolate({x: 0, dx: 0}, a);
            return function(t) {
              var b = i(t);
              __test__.x0  = b.x;
              __test__.dx0 = b.dx;
              return arc(b);
            };
          });

        // shared
        path.attr("display", function(d) { return d.depth ? null : "none"; })
          .style("stroke", "#fff")
          .style("fill-rule", "evenodd")
          .each(function(d) {
            if (d.count == null && d.depth) {
              d.count = 0;
              for (var i = d.children.length - 1; i >= 0; i--) {
                d.count += d.children[i].count;
              };
            }
          })
          .each(function(d, i) {
            var percentage;
            if (d.parent) {
              if (d.parent.depth) {
                percentage = Math.round(d.count / d.parent.count * 100);
              } else {
                var total = 0;
                for (var i = d.parent.children.length - 1; i >= 0; i--) {
                  total += d.parent.children[i].count;
                };
                percentage = Math.round(d.count / total * 100);
              }
            }

            var title = percentage ?
                       (d.name + ': ' + d.count + ' (' + percentage + '%)') :
                       (d.name + ': ' + d.count);

            $(this).tooltip('destroy').tooltip({
              animation: false,
              title: title,
              container: 'body',
              placement: arc.centroid(d)[0] > 0 ? 'right' : 'left'
            });
          });

        // exit
        path.exit()
          .each(function() { $(this).tooltip('destroy'); })
          .transition()
          .duration(1500)
          .attrTween("d", function(a) {
            var i = d3.interpolate(a, {x: 0, dx: 0});
            return function(t) {
              return arc(i(t));
            };
          })
          .remove();
      }
    }, // END controller function
    link: function(scope, element, attrs) {

    } // END link function
  } // END return {}
}); // END directive sunburstChart


// Return a number indicate the order of zodiac, with Capricorn as 0
//
app.factory('getZodiacOrder', function() {
  var zodiacs = [
    'capricorn', 'aquarius', 'pisces' , 'aries',
    'taurus'   , 'gemini'  , 'cancer' , 'leo',
    'virgo'    , 'libra'   , 'scorpio', 'sagittarius',
    'none'
  ];
  return function(zodiacName) {
    var index = zodiacs.indexOf(zodiacName.toLowerCase());
    if (index >= 0) {
      return index;
    } else {
      return 0;
    }
  }
});


// Capitalize First Letter
//
app.factory('capitalizeFirst', function() {
  return function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
});


// Return HEX Color Code for Catagories
//
app.factory('hexColor', function() {
  var colors = {
    'capricorn'  : '#ED5565',
    'aquarius'   : '#FC6E51',
    'pisces'     : '#FFCE54',
    'aries'      : '#A0D468',
    'taurus'     : '#48CFAD',
    'gemini'     : '#4FC1E9',
    'cancer'     : '#5D9CEC',
    'leo'        : '#AC92EC',
    'virgo'      : '#EC87C0',
    'libra'      : '#F5F7FA',
    'scorpio'    : '#CCD1D9',
    'sagittarius': '#656D78',
    'male'       : '#4B89DC',
    'female'     : '#D770AD',
    'none'       : '#434A54',
    'unknown'    : '#434A54'
  };
  return function(cat) {
    if (colors[cat.toLowerCase()]) {
      return colors[cat.toLowerCase()];
    } else {
      return '#000000';
    }
  };
});


})(window, window.jQuery, window.angular, $access_token);
