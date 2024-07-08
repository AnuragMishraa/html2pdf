
$(document).ready(function () {
  $('[data-toggle="tooltip"]').tooltip({
    trigger: "hover",
  });
});

$(document).ready(function () {
  $('a[href^="#"]').on("click", function (event) {
    var target = $(this.getAttribute("href"));
    if (target.length) {
      event.preventDefault();
      $("html, body").stop().animate(
        {
          scrollTop: target.offset().top,
        },
        1000
      );
    }
  });
});

async function main() {
  await setDynamicFields()
  downloadPDF()
}

$(document).ready(main);



async function setDynamicFields() {
  const jsonHostBaseUrl = "http://localhost:3000";

  const fetchData = async () => {
    const collectionResponse = await fetch(`${jsonHostBaseUrl}/collection`);
    const environmentResponse = await fetch(`${jsonHostBaseUrl}/environment`);
    const runResponse = await fetch(`${jsonHostBaseUrl}/run`);
    const skippedTestsResponse = await fetch(`${jsonHostBaseUrl}/skippedTests`);

    const collectionData = await collectionResponse.json();
    const environmentData = await environmentResponse.json();
    const runData = await runResponse.json();
    const skippedTestsData = skippedTestsResponse.ok
      ? await skippedTestsResponse.json()
      : [];

    return {
      collections: collectionData,
      environment: environmentData,
      run: runData,
      skippedTests: skippedTestsData,
    };
  };

  // function to populate summary page with JSON Data
  async function insertSummaryData() {
    const jsonData = await fetchData();
    const runStats = jsonData.run.stats;
    const collectionInfo = jsonData.collections.info;
    const timings = jsonData.run.timings;
    const executions = jsonData.run.executions;
    const environment = jsonData.environment;
    const runFailures = jsonData.run.failures;
    const skipped = jsonData.skippedTests;

    document.querySelector("#summary-header").innerHTML =
      collectionInfo.name + " Report";
    document.querySelector("#summary-header").style.fontSize = "40px";
    document.querySelector("#summary-header").style.fontWeight = "400";
    document.querySelector("#summary-header").style.paddingTop = "20px";
    document.querySelector("#summary-header").style.paddingBottom = "20px";
    // Total iterations, assertions, failed tests, skipped tests
    document.querySelector("#totalIterations").innerHTML =
      runStats.iterations.total;
    document.querySelector("#totalAssertions").innerHTML =
      runStats.assertions.total;
    document.querySelector("#totalFailedTests").innerHTML =
      runStats.requests.failed +
      runStats.prerequestScripts.failed +
      runStats.testScripts.failed +
      runStats.assertions.failed;
    document.querySelector("#totalSkippedTests").innerHTML =
      skipped?.length ?? 0;
    document.querySelector("#totalRequestsBadge").innerHTML =
      runStats.items.total;
    document.querySelector("#totalSkippedBadge").innerHTML =
      skipped?.length ?? 0;
    document.querySelector("#totalFailedBadge").innerHTML = runFailures?.length;

    // File information
    document.querySelector("#collectionName").innerHTML = collectionInfo.name;
    document.querySelector("#environmentName").innerHTML =
      environment.name ?? "Global";

    // Timings and data
    document.querySelector("#totalRunDuration").innerHTML = `${(
      (timings.completed - timings.started) /
      1000
    ).toFixed(1)}s`;
    document.querySelector(
      "#averageResponseTime"
    ).innerHTML = `${timings.responseAverage.toFixed(0)}ms`;

    // Summary item table
    document.querySelector("#totalRequests").innerHTML =
      runStats.requests.total;
    document.querySelector("#failedRequests").innerHTML =
      runStats.requests.failed;
    document.querySelector("#totalTestScripts").innerHTML =
      runStats.testScripts.total;
    document.querySelector("#failedTestScripts").innerHTML =
      runStats.testScripts.failed;
    document.querySelector("#totalAssertions2").innerHTML =
      runStats.assertions.total;
    document.querySelector("#failedAssertions").innerHTML =
      runStats.assertions.failed;
    document.querySelector("#totalSkippedTests2").innerHTML =
      skipped?.length ?? 0;
  }
  await insertSummaryData();
  
  // function to populate requests page with JSON data
  async function processItems(items, parentName = '', parentPath = []) {
      const executionData = document.getElementById('execution-data');
      const requestIndividualData = await fetch(`${jsonHostBaseUrl}/run`);
      const requestIndividualResponse = await requestIndividualData.json();
      const requestIndividual = requestIndividualResponse.executions;
      console.log({ requestIndividual });

      let totalRequestCount = 0;

      for (const item of items) {
          const folderId = item.id;
          const folderName = parentName ? `${parentName} / ${item.name}` : item.name;
          const folderRequests = item.item || [];
          const currentPath = [...parentPath, item.name];

          let folderPassCount = 0;
          let folderFailCount = 0;
          let folderTotalAssertions = 0;
          let requestCount = 0;

          const folderHeader = document.createElement('div');
          folderHeader.className = 'alert text-uppercase text-center';
          folderHeader.innerHTML = `
              <a data-toggle="expand" href="#" data-target="#folder-expand-${folderId}" aria-expanded="true" aria-controls="expand" id="folder-${folderId}" class="expanded text-dark z-block">
                  <i class="fas fa-info-circle float-left resultsInfoPass"></i>
                  ${folderName} - 0 Requests in the folder
                  <i class="float-lg-right fa fa-chevron-down" style="padding-top: 5px"></i>
              </a>
          `;

          const folderCollapse = document.createElement('div');
          folderCollapse.id = `folder-expand-${folderId}`;
          folderCollapse.className = 'expand';
          folderCollapse.setAttribute('aria-labelledby', `folder-${folderId}`);

          for (const request of folderRequests) {
              if (request.item) {
                  // If the request has nested items, recursively process them
                  const nestedRequestsCount = await processItems([request], folderName, currentPath);
                  requestCount += nestedRequestsCount;
              } else {
                  requestCount++;
                  const requestId = request.id;
                  const requestName = request.name;

                  const execution = requestIndividual.find(exec => exec.item.id === requestId);

                  let requestPassCount = 0;
                  let requestFailCount = 0;
                  let totalAssertions = 0;
                  let passPercentage = 100;

                  if (execution && execution.assertions) {
                      totalAssertions = execution.assertions.length;
                      execution.assertions.forEach(assertion => {
                          if (assertion.error) {
                              requestFailCount++;
                          } else {
                              requestPassCount++;
                          }
                      });
                  }

                  if (totalAssertions > 0) {
                      passPercentage = (requestPassCount / totalAssertions) * 100;
                  }

                  folderPassCount += requestPassCount;
                  folderFailCount += requestFailCount;
                  folderTotalAssertions += totalAssertions;

                  const requestCard = document.createElement('div');
                  requestCard.style.marginBottom = '13px';
                  requestCard.className = `card ${requestFailCount > 0 ? 'bg-danger' : 'bg-success'}`;

                  const requestHeader = document.createElement('div');
                  requestHeader.className = `card-header ${requestFailCount > 0 ? 'bg-danger' : 'bg-success'}`;
                  requestHeader.innerHTML = `
                      <a data-toggle="expand" href="#" data-target="#expand-${requestId}" aria-expanded="true" aria-controls="expand" id="requests-${requestId}" class="expanded text-white z-block">
                      Iteration: 1 - ${requestName}
                      <i class="float-lg-right fa fa-chevron-down" style="padding-top: 5px"></i>
                      </a>
                  `;

                  const requestCollapse = document.createElement('div');
                  requestCollapse.id = `expand-${requestId}`;
                  requestCollapse.className = 'expand';
                  requestCollapse.setAttribute('aria-labelledby', `requests-${requestId}`);

                  const requestBody = document.createElement('div');
                  requestBody.className = 'card-body';
                  requestBody.innerHTML = `
                      <div class="row">
                      <div class="col-sm-6 mb-3">
                          <div class="card border-info">
                          <div class="card-body" style="height: 255px">
                              <h5 class="card-title text-uppercase text-white text-center bg-info">Request Information</h5>
                              <span><i class="fas fa-info-circle"></i></span><strong> Request Method:</strong> <span class="badge-outline-success badge badge-success">${execution.request.method}</span><br />
                              <span><i class="fas fa-info-circle"></i></span><strong> Request URL:</strong> <a href="${execution.request.url.protocol}://${execution.request.url.host.join('.')}:${execution.request.url.port}/${execution.request.url.path.join('/')}" target="_blank">${execution.request.url.protocol}://${execution.request.url.host.join('.')}:${execution.request.url.port}/${execution.request.url.path.join('/')}</a><br />
                          </div>
                          </div>
                      </div>
                      <div class="col-sm-6 mb-3">
                          <div class="card border-info">
                              <div class="card-body pb-0">
                                  <h5 class="card-title text-uppercase text-white text-center bg-info">Response Information</h5>
                                  <span><i class="fas fa-info-circle"></i></span><strong> Response Code:</strong> <span class="float-right badge-outline badge badge-success">${execution.response.code}</span><br />
                                  <span><i class="fas fa-stopwatch"></i></span><strong> Mean time per request:</strong> <span class="float-right badge-outline badge badge-success">${execution.response.responseTime}ms</span><br />
                                  <span><i class="fas fa-database"></i></span><strong> Mean size per request:</strong> <span class="float-right badge-outline badge badge-success">${execution.response.responseSize}B</span><br />
                              </div>
                              <div class="card-body pt-0">
                                  <hr/>
                                  <h5 class="card-title text-uppercase text-white text-center bg-info">Test Pass Percentage</h5>
                                  <div class="progress" style="height: 40px">
                                      <div class="progress-bar ${requestFailCount > 0 ? 'bg-danger' : 'bg-success'}" style="width: ${passPercentage}%" role="progressbar">
                                          <h5 class="text-uppercase text-white text-center" style="padding-top: 5px"><strong>${passPercentage}%</strong></h5>
                                      </div>
                                  </div>
                              </div>
                          </div>  
                      </div>
                      
                      <div class="col-sm-12 mb-3">
                          <div class="card border-info">
                          <div class="card-body">
                              <h5 class="card-title text-uppercase text-white text-center bg-info">Request Headers</h5>
                              <div class="table-responsive">
                              <table class="table table-bordered">
                                  <thead class="thead-light text-center">
                                  <tr>
                                      <th scope="col">Header Name</th>
                                      <th scope="col">Header Value</th>
                                  </tr>
                                  </thead>
                                  <tbody>
                                  ${execution.request.header.map(header => `
                                      <tr>
                                          <td>${header.key}</td>
                                          <td>${header.value}</td>
                                      </tr>
                                  `).join('')}
                                  </tbody>
                              </table>
                              </div>
                          </div>
                          </div>
                      </div>
                      <div class="col-sm-12 mb-3">
                          <div class="card border-info">
                          <div class="card-body">
                              <h5 class="card-title text-uppercase text-white text-center bg-info">Response Headers</h5>
                              <div class="table-responsive">
                              <table class="table table-bordered">
                                  <thead class="thead-light text-center">
                                  <tr>
                                      <th scope="col">Header Name</th>
                                      <th scope="col">Header Value</th>
                                  </tr>
                                  </thead>
                                  <tbody>
                                  ${execution.response.header.map(header => `
                                      <tr>
                                          <td>${header.key}</td>
                                          <td>${header.value}</td>
                                      </tr>
                                  `).join('')}
                                  </tbody>
                              </table>
                              </div>
                          </div>
                          </div>
                      </div>
                      <div class="col-sm-12 mb-3">
                          <div class="card border-info">
                          <div class="card-body">
                              <h5 class="card-title text-uppercase text-white text-center bg-info">Response Body</h5>
                              ${execution.response.stream ? `
                                  <pre>${new TextDecoder().decode(new Uint8Array(execution.response.stream.data))}</pre>
                              ` : `
                                  <div class="progress" style="height: 40px">
                                      <div class="progress-bar bg-success" style="width: 100%" role="progressbar">
                                          <h5 class="text-uppercase text-white text-center" style="padding-top: 5px"><strong>No response body for this request</strong></h5>
                                      </div>
                                  </div>
                              `}
                          </div>
                          </div>
                      </div>
                      <div class="col-sm-12 mb-3">
                          <div class="card border-info">
                          <div class="card-body">
                              <h5 class="card-title text-uppercase text-white text-center bg-info">Test Information</h5>
                              <div class="table-responsive">
                                  <table class="table table-bordered">
                                      <thead class="thead-light text-center">
                                      <tr>
                                          <th scope="col">Test</th>
                                          <th scope="col">Result</th>
                                      </tr>
                                      </thead>
                                      <tbody>
                                      ${execution.assertions ? execution.assertions.map(assertion => `
                                          <tr>
                                              <td>${assertion.assertion}</td>
                                              <td class="${assertion.error ? 'text-danger' : 'text-success'}">${assertion.error ? 'Failed' : 'Passed'}</td>
                                          </tr>
                                      `).join('') : `
                                          <tr>
                                              <td colspan="2">No assertions found</td>
                                          </tr>
                                      `}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                          </div>
                      </div>
                      </div>
                  `;

                  requestCollapse.appendChild(requestBody);
                  requestCard.appendChild(requestHeader);
                  requestCard.appendChild(requestCollapse);
                  folderCollapse.appendChild(requestCard);
              }
          }

          folderHeader.innerHTML = `
              <a data-toggle="collapse" href="#" data-target="#folder-expand-${folderId}" aria-expanded="false" aria-controls="expand" id="folder-${folderId}" class="expanded text-dark z-block">
                  <i class="fas fa-info-circle float-left resultsInfoPass"></i>
                  ${folderName} - ${requestCount} Request${requestCount !== 1 ? 's' : ''} in the folder
                  <i class="float-lg-right fa fa-chevron-down" style="padding-top: 5px"></i>
              </a>
          `;

          if (folderTotalAssertions > 0) {
              const folderPassPercentage = (folderPassCount / folderTotalAssertions) * 100;
              if (folderFailCount > 0) {
                  folderHeader.classList.add('bg-danger');
                  folderHeader.querySelector('i.resultsInfoPass').classList.add('text-danger');
              } else {
                  folderHeader.classList.add('bg-success');
                  folderHeader.querySelector('i.resultsInfoPass').classList.add('text-success');
              }
              folderHeader.innerHTML += `
                  <span class="badge ${folderFailCount > 0 ? 'badge-danger' : 'badge-success'} float-lg-right">${folderPassPercentage.toFixed(2)}% Passed</span>
              `;
          } else {
              folderHeader.classList.add('bg-warning');
          }

          executionData.appendChild(folderHeader);
          executionData.appendChild(folderCollapse);

          totalRequestCount += requestCount;
      }

      return totalRequestCount;
  }

  (async () =>  {
      const collectionData = await fetch(`${jsonHostBaseUrl}/collection`);
      const collectionDataResponse = await collectionData.json();
      const items = collectionDataResponse.item;
      console.log({ items });
      await processItems(items);
  })();



  // function to populate failed page with JSON data
  function generateFailureHTML(failure, index) {
    return `
        <div class="col-sm-12 mb-3">
          <div class="card-deck">
            <div class="card border-danger">
              <div class="card-header bg-danger">
                <a
                  data-toggle="expand"
                  href="#"
                  data-target="#fails-expand"
                  aria-expand="true"
                  aria-controls="expand"
                  id="fails-dd024aa1-91b0-4f6f-99c8-8902942f9a97"
                  class="expand text-white z-block"
                >
                Iteration ${failure.cursor.iteration + 1
      } - ${failure.error.name} - ${failure.parent.name} - ${failure.source.name}
                <i
                  class="float-lg-right fa fa-chevron-down"
                  style="padding-top: 5px"
                ></i>
                </a>
              </div>
              <div
                id="fails-expand-dd024aa1-91b0-4f6f-99c8-8902942f9a97"
                class="expand"
                aria-labelledby="fails-dd024aa1-91b0-4f6f-99c8-8902942f9a97"
              >
                <div class="card-body">
                  <h5><strong>Failed Test: </strong>${failure.source.name}</h5>
                  <hr />
                  <h5
                    class="card-title text-uppercase text-white text-center bg-danger"
                  >
                    ASSERTION ERROR MESSAGE
                  </h5>
                  <div>
                    <pre><code >${failure.error.message}</code></pre>
                  </div>
                </div>
            </div>
        </div>
    `;
  }
  async function renderFailures() {
    const runResponse = await fetch(`${jsonHostBaseUrl}/run`);
    const runData = await runResponse.json();
    const failures = runData.failures;
    if (failures.length > 0) {
      const failuresContainer = document.getElementById("failures");
      failuresContainer.style.marginTop = "40px";
      failuresContainer.innerHTML += `
        <div class="alert alert-danger text-uppercase text-center">
          <h4>Showing ${failures.length} Failures</h4>
        </div>`;
      failures.forEach((failure, index) => {
        failuresContainer.innerHTML += generateFailureHTML(failure, index);
      });
    } else {
      const noFailures = document.getElementById("failures");
      noFailures.innerHTML = `
          <div class="alert alert-success text-uppercase text-center">
            <br /><br />
              <h1 class="text-center">
                There are no failed tests
                <span><i class="far fa-thumbs-up"></i></span>
              </h1>
            <br /><br />
          </div>`;
    }
  }
  await renderFailures();

  // function to populate skipped tests page with JSON data
  function generateSkippedTestHTML(test, index) {
    return `
        <div class="col-sm-12 mb-3">
            <div class="card-deck">
                <div class="card border-warning">
                    <div class="card-header bg-warning text-white">
                        <a data-toggle="expand" href="#" data-target="#skipped-expand-${test.cursor.ref
      }" aria-expand="true" aria-controls="expand" id="skipped-${test.cursor.ref}" class="expand text-white z-block">
                            Iteration ${test.cursor.iteration + 1
      } - Skipped Test <i class="float-lg-right fa fa-chevron-down" style="padding-top:5px;"></i>
                        </a>
                    </div>
                    <div id="skipped-expand-${test.cursor.ref
      }" class="expand" aria-labelledby="skipped-${test.cursor.ref}">
                        <div class="card-body">
                            <h5><strong>Request Name:</strong> ${test.item.name
      }</h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  }
  async function renderSkippedTests() {
    const skippedTestsResponse = await fetch(`${jsonHostBaseUrl}/skippedTests`);
    const skippedTests = skippedTestsResponse.ok
      ? await skippedTestsResponse.json()
      : [];
    if (skippedTests.length > 0) {
      const skippedTestsContainer = document.getElementById("skipped-tests");
      skippedTestsContainer.style.marginTop = "100px";
      skippedTestsContainer.innerHTML = `
        <div class="alert alert-warning text-uppercase text-center">
          <h4>Showing ${skippedTests.length} Skipped Tests</h4>
        </div>
      `;
      skippedTests.forEach((test, index) => {
        skippedTestsContainer.innerHTML += generateSkippedTestHTML(test, index);
      });
    } else {
      const skippedTestsContainer = document.getElementById("skipped-tests");
      skippedTestsContainer.style.marginTop = "180px";
      skippedTestsContainer.innerHTML += `
          <div class="alert alert-success text-uppercase text-center">
            <br /><br />
              <h1 class="text-center">
                There are no skipped tests
                <span><i class="far fa-thumbs-up"></i></span>
              </h1>
              <br /><br />
            </div>
        `;
    }
  }
  await renderSkippedTests();
}


function downloadPDF() {
  const element = document.querySelector("#main");
  const opt = {
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
  };

  // Use html2pdf to generate the PDF
  html2pdf().from(element).set(opt).save('htmlToPdf.pdf');
}
// async function createPDF() {
//   try {
//     console.log("create PDF function executed!");
//     let elementDiv = document.getElementById("main");
//     const element = elementDiv.innerHTML;
//     console.log({ element });
//     let opt = {
//       margin: 1,
//       filename: "my-invoice.pdf",
//       image: { type: "jpeg", quality: 0.95 },
//       html2canvas: { useCORS: true, logging: true },
//       jsPDF: { unit: "in", format: "A3", orientation: "portrait" },
//     };

//     const pdf = await window
//       .html2pdf()
//       .from(element)
//       .set(opt)
//       .outputPdf("blob");
//     console.log({ pdf });
//     const link = document.createElement("a");
//     link.href = window.URL.createObjectURL(pdf);
//     link.download = "downloaded.pdf";
//     console.log({ link });
//     link.click();

//     console.log("PDF generation successful");
//     return pdf;
//   } catch (error) {
//     console.error("Failed to generate PDF:", error);
//     throw error;
//   }
// }

// Example usage
// setTimeout(() => {
//   createPDF()
//     .then((res) => {
//       console.log("PDF creation result:", res);
//     })
//     .catch((err) => {
//       console.error("PDF creation error:", err);
//     });
// }, 3000);

// const { jsPDF } = window.jspdf;
// setTimeout(() => {
//       const domElement = document.getElementById('main');
//       if (domElement) {
//         html2canvas(domElement).then((canvas) => {
//           const imgData = canvas.toDataURL('image/png');
//           const pdf = new jsPDF('p','pt','a3');
//           pdf.addHTML(domElement, 0, -20, { allowTaint: true, useCORS: true, pagesplit: false }, function () {
//             pdf.save(`${ new Date().toISOString() }.pdf`);
//           });
//           // pdf.save('{{downloaded_file_name}}.pdf');
//           // pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
//         });
//       }
//     }, 3000);
