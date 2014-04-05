$(function () {
  var compiledTemplate = Handlebars.compile($("#template").html()),
    $mainBox = $("#mainBox"),
    $harInput = $("#harInput"),
    defaultType = "time",
    sorting,
    domains = [];

  function mapEntries(pageHar) {
    return pageHar.log.entries.map(function (entry) {
      var entryUrl = document.createElement('a');
      entryUrl.href = entry.request.url;

      return {
        pathname: entryUrl.pathname,
        name: entryUrl.hostname,
        size: entry.response.content.size,
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
      currentDomain.origTime = currentDomain.origTime + entry.time;
      currentDomain.time = round(currentDomain.origTime + entry.time);
      currentDomain.size += entry.size;
    } else {
      domains.push({
        name: entry.name,
        requests: 1,
        origTime: entry.time,
        time: round(entry.time),
        size: entry.size
      });
    }
  }

  function renderTable() {
    $mainBox.html(compiledTemplate({
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

  function readHar() {
    var pageHar, entries;


    pageHar = $harInput.val();

    try {
      pageHar = JSON.parse(pageHar)
    } catch(e) {
      alert("could not parse har input. " + e);
      return;
    }

    domains = [];
    entries = mapEntries(pageHar);
    entries.forEach(function (entry) {
      var currentDomain = _.find(domains, function (domain) {
        return domain.name === entry.name;
      });

      add(currentDomain, entry);
    });

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