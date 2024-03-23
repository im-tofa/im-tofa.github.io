const chart = new Chart("myChart", {
  type: "line",
  data: {
    labels: [],
    datasets: []
  },
  options: {
    legend: {display: true},
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: {
                day: 'MMM D YYYY'
              }
            },
            title: {
              display: true,
              text: 'Time'
            },
            // ticks: {
            //   callback: function(val, index) {
            //     // Hide the label of every 2nd dataset
            //     return index % 24 === 0 ? val : '';
            //   }
            // }
        },
        y: {
          type: 'linear',
          grace: '5%',
          title: {
            display: true,
            text: 'ELO'
          }
        }
    }
  }
});

const timestampToEpoch = timestamp => {
    return timestamp - (timestamp % 3600000);
}

const R = () => Math.floor(Math.random() * 255);
const B = R;
const G = R;

let viewingElo = true;
let latestData = {};

const updateChart = data => {
    const datesSet = new Set();

    // collect all dates
    for(const [_, ratings] of Object.entries(data.ratings)) {
        if(!activeFormat(ratings)) continue; // ignore inactive formats
        for(const rating of ratings) {
            datesSet.add(timestampToEpoch(rating.created));
        }
    }

    datesSet.add(timestampToEpoch(new Date().valueOf())); // to ensure that data missing between last change and today are backfilled
    const dates = Array.from(datesSet).sort();
    console.log(dates);

    /**
     {
        label: "A",
        data: [860,1140,1060,1060,null,1110,1330,2210,7830,2478],
        borderColor: "red",
        fill: true,
        backgroundColor: "rgba(255,0,0,0.5)",
        spanGaps: true
    }
    */

    const datasets = [];

    // iterate through each date and construct graph
    for(const [format, ratings] of Object.entries(data.ratings)) {
        if(!activeFormat(ratings)) continue; // ignore inactive formats
        const colorStr = R() + "," + G() + "," + B();
        const dataset = {
            label: format,
            borderColor: "rgb(" + colorStr + ")",
            fill: true,
            borderJoinStyle: "round",
            backgroundColor: "rgba(" + colorStr + ", 0.5)",
            spanGaps: true
        };

        const datapoints = new Array(dates.length);
        datapoints.fill(null);
        
        for(const i in dates) {
          const date = dates[i];
          for(const rating of ratings) {
              if(timestampToEpoch(rating.created) == date) {
                  datapoints[i] = viewingElo ? Math.round(rating.elo) : rating.gxe;
              }
          }
        }

        // backfill missing dates
        for(const i in dates) {
          if(i === 0) continue;
          if(datapoints[i] === null) datapoints[i] = datapoints[i-1];
        }

        dataset.data = datapoints;
        datasets.push(dataset);
    }

    chart.options.scales.y.title.text = viewingElo ? "ELO" : "GXE";
    chart.data.labels = dates; //new Date(timestamp).toLocaleString(undefined, {dateStyle: 'short' , timeStyle: 'short'}));
    chart.data.datasets = datasets;
    chart.update();
};

const clearChart = () => {
  chart.data.datasets = [];
  chart.update();
};

const form = document.querySelector("#userinfo");
const statusTag = document.querySelector("#status");

const activeFormat = (ratings) => {
  const formData = new FormData(form);
  const days = parseInt(formData.get("days"));
  if(!days) return true;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return timestampToEpoch(ratings[0]?.created) >= timestampToEpoch(cutoff.valueOf());
}

function toggleMetric() {
  let metric = document.getElementById("myMetric");
  if (viewingElo) {
    viewingElo = false;
    metric.innerHTML = "View ELO";
  } else {
    viewingElo = true;
    metric.innerHTML = "View GXE";
  }

  updateChart(latestData);
};

async function sendData() {
  // Associate the FormData object with the form element
  const formData = new FormData(form);

  try {
    
    statusTag.innerHTML = "Fetching data ...";
    const response = await fetch(
        "https://ratings-api-gjto3y2yyq-ew.a.run.app/api/v1/ratings/" + formData.get("username") + (formData.get("format") ? "?format=" + formData.get("format") : ""), 
        {method: "GET"}
    );

    if(response.status === 404) {
        statusTag.innerHTML = "User " + formData.get("username") + " is not being tracked; to start tracking your user, hop on Pokemon Showdown as your user and message '.subscribe' (without quotation) to my bot, 'im tofas bot'!";
        clearChart();
        return;
    }

    if(response.status === 429) {
        statusTag.innerHTML = "Rate limit reached. You may only submit 10 times within a minute, please try again shortly";
        clearChart();
        return;
    }

    statusTag.innerHTML = "";
    latestData = await response.json();
    console.log(latestData);

    updateChart(latestData);
  } catch (e) {
    console.error(e);
  }
}

// Take over form submission
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendData();
});