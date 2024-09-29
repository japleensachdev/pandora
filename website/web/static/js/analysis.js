async function LookylooSubmit(lookyloo_url, url_to_submit) {
    uuid = await fetch(`${lookyloo_url}/submit`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({url: url_to_submit, listing: false})
    })
    .then(response => response.json())
    .then(data => {
        return data;
    })
    .catch((error) => {
        throw new Error(error);
    });
    return uuid;
}

async function lookyloo(lookyloo_url, sha256, url_to_submit) {
  let uuid = await LookylooSubmit(lookyloo_url, url_to_submit);
  document.getElementById(`lookyloo_submit-${sha256}`).style.display = 'none';
  document.getElementById(`lookyloo_link-${sha256}`).style.display = 'block';
  document.getElementById(`lookyloo_link-${sha256}`).href = `${lookyloo_url}/tree/${uuid}`;
}

function Analysis(CSRFToken) {
    this.CSRFToken = CSRFToken;
    this.task = null;
    this.refresher = null;
}

Analysis.prototype.refreshStatus = function () {
    // Refresh status alert
    $("#taskStatusAlert").find(".alert").addClass("d-none");
    if (this.task.status === 'DELETED') {
        $("#alertDeleted").removeClass("d-none");
    }
    if (! this.workers_done) {
        $("#alertPending").removeClass("d-none");
    }
    if (this.task.status === "ERROR") {
        $("#alertFailed").removeClass("d-none");
    }

    // Refresh status icon and message
    $("#taskStatusIcon").each(function( index, element ){
      $(this).addClass("d-none");
    })
    $(`.status-flag-${this.task.status.toLowerCase()}`).removeClass("d-none");
    $("#taskStatusMessage").find(".alert").addClass("d-none");
    if (this.task.status === "OVERWRITE") {
        $("#taskStatusMessage").find(".alert-overwrite").removeClass("d-none");
    } else if (this.task.status === "ERROR") {
        $("#taskStatusMessage").find(".alert-error").removeClass("d-none");
    } else if (this.task.status === "ALERT") {
        $("#taskStatusMessage").find(".alert-danger").removeClass("d-none");
    } else if (this.task.status === "WARN") {
        $("#taskStatusMessage").find(".alert-warning").removeClass("d-none");
    } else if (this.task.status === "CLEAN") {
        $("#taskStatusMessage").find(".alert-success").removeClass("d-none");
    } else {
        $("#taskStatusMessage").find(".alert-info").removeClass("d-none");
    }
};

Analysis.prototype.refreshReports = function () {
    $.each(this.task.reports, function (module, report) {
        // Exit now if report was already finished
        if (! $("#report-"+module).find(".reportStatus")) {
            return;
        }
        // TODO: get html blocks from flask
    });
};

Analysis.prototype.refreshTabs = function () {
    if (this.workers_status.preview && this.workers_status.preview[0]) {
        $('.preview-wait').each(function(index, element) {
          $(this).addClass("d-none");
        })
        $('.preview-done').each(function(index, element) {
          $(this).removeClass("d-none");
        })

        if (this.workers_status.preview[1] == 'NOTAPPLICABLE') {
            document.getElementById("previews_images").innerHTML = 'Cannot generate a preview for this file format.'
        }
        else {
            previews_url = `/previews/${this.task.uuid}`
            if (this.seed) {
                previews_url = `${previews_url}/seed-${this.seed}`
            }

            fetch(previews_url, {
              method: "GET",
              headers: {
                "X-CSRF-Token": this.CSRFToken
              }
            })
            .then(response => response.text())
            .then(text => {
              document.getElementById("previews_images").innerHTML=text;
            })
        }
    }

    if (this.number_observables && document.getElementById("number_observables").innerHTML != '') {
       document.getElementById("number_observables").innerHTML = this.number_observables;
       $('#observables_tab').each(function(index, element) {
           $(this).removeClass("d-none");
       })
       observables_url = `/observables/${this.task.uuid}`
       if (this.seed) {
           observables_url = `${observables_url}/seed-${this.seed}`
       }

       fetch(observables_url, {
         method: "GET",
         headers: {
           "X-CSRF-Token": this.CSRFToken
         }
       })
       .then(response => response.text())
       .then(text => {
         document.getElementById("observables_content").innerHTML=text;
       })
    }

    if (this.number_extracted) {
        document.getElementById("number_extracted").innerHTML = this.number_extracted;
    }
    if (this.workers_status.extractor && this.workers_status.extractor[0]) {
        if (this.workers_status.extractor[1] != 'NOTAPPLICABLE') {
            $('#extracted_tab').each(function(index, element) {
                $(this).removeClass("d-none");
            })
            extracted_url = `/extracted/${this.task.uuid}`
            if (this.seed) {
                extracted_url = `${extracted_url}/seed-${this.seed}`
            }

            fetch(extracted_url, {
              method: "GET",
              headers: {
                "X-CSRF-Token": this.CSRFToken
              }
            })
            .then(response => response.text())
            .then(text => {
              document.getElementById("extracted_content").innerHTML=text;
            })
        }
    }

    for (const [worker_name, worker_done] of Object.entries(this.workers_status)){
        if (!worker_done[0]) {
            continue;
        };
        if (document.getElementById(worker_name)){
            // Worker results already in page, skip.
            continue;
        }

        worker_url = `/workers_results_html/${this.task.uuid}/${worker_name}`
        if (this.seed) {
            worker_url = `${worker_url}/seed-${this.seed}`
        }
        fetch(worker_url, {
          method: "GET",
          headers: {
            "X-CSRF-Token": this.CSRFToken
          }
        })
        .then(response => response.text())
        .then(text => {
            const workers_results = document.getElementById(`workers_results_${worker_done[1].toLowerCase()}`);
            if (workers_results) {
                workers_results.insertAdjacentHTML('beforeend', text);
            }
            else {
                console.log(`No div for ${worker_done[1]}`);
            }
        })
    }
};

Analysis.prototype.refreshHTML = function () {
    if (this.workers_done && (!this.task.extracted_tasks || this.task.extracted_tasks.every(function(task) { return task.done }))) {
        clearInterval(this.refresher);
    }
    this.refreshStatus();
    this.refreshReports();
    this.refreshTabs();
};

Analysis.prototype.refresh = function (url) {
  fetch(url, {
    method: "POST",
    headers: {
      "X-CSRF-Token": this.CSRFToken
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success === false) {
      throw new Error(data.error);
    }
    analysis.task = data.task;
    analysis.seed = data.seed;
    analysis.file = data.file;
    analysis.workers_done = data.workers_done;
    analysis.workers_status = data.workers_status;
    analysis.number_observables = data.number_observables;
    analysis.number_extracted = data.number_extracted;
    analysis.refreshHTML();
  })
  .catch((error) => {
     clearInterval(analysis.refresher);
     $("#errorJSInner").text("An error has occurred while trying to refresh analysis : " + error);
     $("#errorJS").removeClass("d-none");
  })
};

Analysis.prototype.rescan = function (url) {
    fetch(url, {
      method: "POST",
      headers: {
        "X-CSRF-Token": this.CSRFToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({password: $("#password").val()})
    })
    .then(response => response.json())
    .then(data => {
      if (data.success === false) {
        throw new Error(data.error);
      }
      window.location = new URL(data.link, location.href);
    })
    .catch((error) => {
      $("#errorJSInner").text("An error has occurred while trying to rescan file : " + error);
      $("#errorJS").removeClass("d-none");
    })
};

Analysis.prototype.notify = function (url) {
    fetch(url, {
      method: "POST",
      headers: {
        "X-CSRF-Token": this.CSRFToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({email: $("#email").val(), message: $("#message").val()})
    })
    .then(response => response.json())
    .then(data => {
      if (data.success === false) {
        throw new Error(data.error);
      }
      $("#notifySuccess").removeClass("d-none");
      $("#notifyError").addClass("d-none");
      $("#notifyErrorReason").text("");
      $("#notifySubmit")
        .attr("type", "button")
        .attr("data-bs-dismiss", "modal")
        .text("Done");
    })
    .catch((error) => {
      $("#notifyError").removeClass("d-none");
      $("#notifySuccess").addClass("d-none");
      $("#notifyErrorReason").text(error);
      $("#notifySubmit").attr("type", "submit").text("Retry");
    });
    return false;
};

Analysis.prototype.share = function (url) {
    fetch(url, {
      method: "POST",
      headers: {
        "X-CSRF-Token": this.CSRFToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({validity: $("#shareDays").val() + "d"})
    })
    .then(response => response.json())
    .then(data => {
      if (data.success === false) {
          throw new Error(data.error);
      }
      $("#shareLink").attr("href", new URL(data.link, location.href));
      if (data.lifetime > 0) {
          $("#sharePeriod").text(`for ${parseInt(data.lifetime / (3600*24))} day(s)`);
      } else {
          $("#sharePeriod").text("permanently");
      }
      $("#shareSuccess").removeClass("d-none");
      $("#closeBuild").removeClass("d-none");
      $("#shareError").addClass("d-none");
      $("#shareErrorReason").text("");
      $("#shareBuild").addClass("d-none");
    })
    .catch((error) => {
      $("#shareError").removeClass("d-none");
      $("#shareSuccess").addClass("d-none");
      $("#shareErrorReason").text(error);
      $("#shareBuild").attr("type", "submit").text("Retry");
    });
    return false;
};

Analysis.prototype.deleteFile = function (url) {
    if (! confirm("Are you sure you want to delete this file ? That action is irreversible !")) {
        return false;
    }
    fetch(url, {
      method: "POST",
      headers: {
        "X-CSRF-Token": this.CSRFToken
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success === false) {
        throw new Error(data.error);
      }
      window.location.reload();
    })
    .catch((error) => {
      alert("An error has occurred while removing file : " + error);
    })
    return false;
};
