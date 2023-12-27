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
  }
});

const dateToEpoch = date => {
    const time = date.valueOf();
    return time - (time % 86400000);
}

const R = () => Math.floor(Math.random() * 256);
const B = R;
const G = R;

const updateChart = data => {
    const datesSet = new Set();
    // collect all dates
    for(const [_, ratings] of Object.entries(data.formats)) {
        for(const [date, _] of Object.entries(ratings)) {
            datesSet.add(dateToEpoch(new Date(date).valueOf()));
        }
    }

    const dates = Array.from(datesSet).sort();

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
    for(const [format, ratings] of Object.entries(data.formats)) {
        const colorStr = R() + "," + G() + "," + B();
        const dataset = {
            label: format,
            borderColor: "rgb(" + colorStr + ")",
            fill: true,
            backgroundColor: "rgba(" + colorStr + ", 0.5)",
            spanGaps: true
        };

        const datapoints = new Array(dates.length);
        datapoints.fill(null);
        
        for(const i in dates) {
            const date = dates[i];
            for(const [ratingDate, rating] of Object.entries(ratings)) {
                if(dateToEpoch(new Date(ratingDate).valueOf()) == date) {
                    datapoints[i] = Math.round(rating.elo);
                }
            }
        }

        dataset.data = datapoints;
        datasets.push(dataset);
    }

    chart.data.labels = dates.map(timestamp => new Date(timestamp).toLocaleDateString());
    chart.data.datasets = datasets;
    chart.update();
};

const form = document.querySelector("#userinfo");

async function sendData() {
  // Associate the FormData object with the form element
  const formData = new FormData(form);

  try {
    const response = await fetch(
        "https://ratings-api-gjto3y2yyq-ue.a.run.app/api/v1/ratings/" + formData.get("username") + (formData.get("format") ? "?format=" + formData.get("format") : ""), 
        {method: "GET"}
    );

    const data = await response.json();
    console.log(data);

    updateChart(data);
  } catch (e) {
    console.error(e);
  }
}

// Take over form submission
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendData();
});