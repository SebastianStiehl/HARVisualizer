(function numeralSetup() {
  numeral.language('de', {
    delimiters: {
      thousands: '.',
      decimal: ','
    },
    abbreviations: {
      thousand: 'k',
      million: 'm',
      billion: 'b',
      trillion: 't'
    },
    ordinal: function (number) {
      return '.';
    },
    currency: {
      symbol: '€'
    }
  });

  if (navigator.language === "de") {
    numeral.language("de");
  }
}());

$(function () {
  var compiledTemplate = Handlebars.compile($("#template").html()),
    $mainBox = $("#mainBox"),
    $harInput = $("#harInput"),
    defaultType = "size",
    sorting,
    summedDate,
    domains;

  Handlebars.registerHelper('formatByte', function(value) {
    return numeral(value).format('0 b');
  });

  Handlebars.registerHelper('formatTime', function(value) {
    return numeral(value).format("0,0") + " ms";
  });

  function mapEntries(pageHar) {
    return pageHar.log.entries.map(function (entry) {
      var entryUrl = document.createElement('a');
      entryUrl.href = entry.request.url;

      return {
        pathname: entryUrl.pathname,
        name: entryUrl.hostname,
        size: entry.response.bodySize + entry.response.headersSize,
        type: entry.response.content.mimeType,
        time: entry.time
      };
    });
  }

  function sortByAttr(attr, invers) {
    var larger = invers ? -1 : 1,
      smaller = invers ? 1 : -1;

    sorting = attr + invers;
    domains.sort(function (a, b) {
      if (a[attr] > b[attr]) {
        return larger;
      }
      if (a[attr] < b[attr]) {
        return smaller;
      }
      return 0;
    });
  }

  function sortBy(type) {
    var inverse = false;

    if (sorting === (type + true)) {
      inverse = false
    } else if (sorting === (type + false)) {
      inverse = true;
    }

    sortByAttr(type, inverse);
  }

  function round(num) {
    return Math.round(num);
  }

  function add(currentDomain, entry) {
    if (currentDomain) {
      currentDomain.requests++;
      currentDomain.origTime = (currentDomain.origTime + entry.time);
      currentDomain.time = round(currentDomain.origTime + entry.time);
      currentDomain.size += (entry.size > 0 ? entry.size :  0);
    } else {
      domains.push({
        name: entry.name,
        requests: 1,
        origTime: entry.time,
        time: round(entry.time),
        size: ((entry.size && entry.size > 0) ? entry.size : 0)
      });
    }
  }

  function renderTable() {
    $mainBox.html(compiledTemplate({
      summedDate: summedDate,
      domains: domains
    }));

    $(".sorting a").on("click", function (event) {
      var href = $(this).attr("href").replace("#", "");
      event.preventDefault();

      sortBy(href);
      renderTable();
      renderChart(href);
    });
  }

  function renderChart(type) {
    var chart, data;

    if (type === "name") {
      type = defaultType;
    }

    data = new google.visualization.DataTable();
    data.addColumn('string', 'name');
    data.addColumn('number', type);
    data.addRows(domains.map(function (domain) {
      return [domain.name, domain[type]];
    }));

    chart = new google.visualization.PieChart($("#chart")[0]);
    chart.draw(data, {
      'title': type,
      'height': 400,
      'chartArea': {
        'width': "100%"
      }
    });
  }

  function sumNumbers() {
    _.each(domains, function (domain) {
      _.each(domain, function (attr, name) {
        if (typeof attr === "number" && attr !== undefined) {
          if (!summedDate[name]) {
            summedDate[name] = 0;
          }
          summedDate[name] += attr;
        }
      });
    });
  }

  function fillDomains(pageHar) {
    var entries;

    domains = [];
    summedDate = {};
    entries = mapEntries(pageHar);
    _.each(entries, function (entry) {
      var currentDomain = _.find(domains, function (domain) {
        return domain.name === entry.name;
      });

      add(currentDomain, entry);
    });
  }

  function readHar() {
    var pageHar;

    pageHar = $harInput.val();

    try {
      pageHar = JSON.parse(pageHar)
    } catch(e) {
      alert("could not parse har input. " + e);
      return;
    }

    fillDomains(pageHar);
    sumNumbers();
    sortByAttr(defaultType, true);
    renderTable();
    renderChart(defaultType);
  }

  $("#calculate").on("click", readHar);

  $("#loadExample").on("click", function () {
    $.get("example.har", function (data) {
      $harInput.val(data);
      readHar();
    })
  });

});