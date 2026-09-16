---
title: API Travelcompositor - Transportes
source: https://online.travelcompositor.com/api/documentation/index.xhtml#ApiTransport
author:
published:
created: 2026-09-15
description: Travelc
tags:
  - clippings
---
The following information will help you to understand the process that you need to go through to complete your application, and the service that we provide to all our Travelcompositor API customers.

**There are three simple steps before start developing with Travelc API**

## 1 - Request your credentials

Contact with your account manager who will provide you with the user name, password and microsite id. These fields are required to launch the Authenticate request that is the first one you have to invoke.

## 2- Authenticate token

The authentication request will return a valid API token. You need this API token in order to invoke any other method.

```
curl --location --request POST 'https://online.travelcompositor.com/resources/authentication/authenticate' \
--header 'Accept-Encoding: gzip' \
--header 'Content-Type: application/json' \
--data-raw '{
    "username": "your_user_name",
    "password": "your_password",
    "micrositeId": "your_microsite_id"
}'
```

```
{
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTE0ODM0LCJqdGkiOiJCNTI0NkY4Ri03NzZELTRFNEMtQkM3Ni03MDRDODgwNzZBNzgifQ.Wv9zT2PaipZsTuHUDd7g1_oCRY5bIlwscKsVDakwPvxMUijzRYi0EU_9RK-7qYNC3yJJb1izarZoSRP-wF2y-g",
    "expirationInSeconds": 7200
}
```

## 3 - Begin testing

Once you have the API token, you can start making requests to the endpoint provided by your account manager. For your first request you can use Postman collection:

[Postman](https://online.travelcompositor.com/resources/swagger.json)

- 1 - **Accept-encoding** with GZip compression must be requested in all HTTP requests, it will then supply you with a compressed response and the client will receive our response along the Content-Encoding: gzip header. The client that receives the response has to decompress it before processing. Travelc API may reject requests that do not include Accept-encoding
- 2 - To contact our support team, you should always indicate the traceId that is returned in each header (**Travelc-Trace-Id**) or in the body of the reply (**traceId**).

TravelC Accommodation API is designed to provide a set of API calls to bring accommodation distribution to any website or device:

The TravelC Accommodation API suite is divided into 3 parts:

\- **Booking flow**

\- **Static content**

\- **Post-booking**

The number of accommodations available will depend on the providers connected by the customer.

Use our Postman collection to test our APIs now and familiarize yourself with them:

[Postman](https://online.travelcompositor.com/resources/api-accommodation/TravelC_Api_Accommodation.postman_collection.json)

If you don't have credentials yet, check out our [Getting started](https://online.travelcompositor.com/api/documentation/index.xhtml#intro) section to help you understand how to get started with the TravelC API

All API responses always return an audit object that the support team might request to trace requests.

```
"auditData": {
    "timestamp": "2022-11-15 09:05:14",
    "processTime": 69,
    "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
    "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
    "availabilityId": 946,
    "server": "http://travelc-host-xxxx:xxxxx"
}
```

Below we show a flowchart with the steps necessary to complete a reservation through the API. Then we will explain each of the steps:

![](https://online.travelcompositor.com/resources/images/api-documentation/booking-flow.png)

This is the first step needed to create a new reservation. There are 3 ways to request accommodation availability:

\- **Accommodation codes**. It retrieves all available results from a specific list of accommodations as long as they are within a radius of 200 km.

\- **Destination Id**: It retrieves all available results from a specific TravelC destination. Contact our support team for information on how to retrieve destination codes.

\- **Accommodation single code**. Retrieves all room combinations for a specific accommodation.

Depending on the requested parameters, the API will provide you with all the results available for them. Each accommodation will have a group of room combinations. A combination is a group of rooms that will depend on the number of distributions initially requested in the request. The availability services are responsible for making the Cartesian product of all available rooms and the only thing you will need to book that set of rooms is the **combinationKey** that uniquely identifies each combination and that will be necessary for the next step of the reservation.

The **combinationKey** can be quite long, and if you plan to store the same at its end, you may need to configure the length of the field accordingly. In any case, we do not recommend storing it since this code changes in each response of the services.

**Quote accomodations - Request**

As we have said before, a search for accommodation, can be through accommodation codes or destination code.

Additionally, you can configure a set of filters in the search to receive either all available combinations or only the best ones, with the option to include or exclude OnRequest options.

All Combinations Mode

\- This mode will return all available combinations in the Quote step sorted by price. To do this, set the **bestCombinations** parameter to false and select the number of combinations you wish to receive by filling in the **maxCombinations** parameter. If you only fill in the **bestCombinations** parameter and not **maxCombinations**, the default value is **60**.

Best Combinations Mode

\- This mode will return the best combination for each available meal plan and whether it is refundable or non-refundable. To do this, set the **bestCombinations** parameter to true and select the number of combinations you wish to receive by filling in the **maxCombinations** parameter. If you only fill in the **bestCombinations** parameter and not **maxCombinations**, the default value is **1**.  
  
To make the functionality of this mode clearer, we provide an example below:  
  
A accommodation that has 6 combinations:  
\- 'Combination 1' - room only - 100 € - NON\_REFUNDABLE  
\- 'Combination 2' - room only - 110 € - NON\_REFUNDABLE  
\- 'Combination 3' - room only - 150 € - REFUNDABLE  
\- 'Combination 4' - all inclusive - 200 € - PARTIALLY\_REFUNDABLE  
\- 'Combination 5' - all inclusive - 210 € - NON\_REFUNDABLE  
\- 'Combination 6' - all inclusive - 220 € - REFUNDABLE  
  
The returned with maxCombinations = 4 would be:  
\- 'Combination 1' - room only - 100 € - NON\_REFUNDABLE  
\- 'Combination 3' - room only - 150 € - REFUNDABLE  
\- 'Combination 4' - all inclusive - 200 € - PARTIALLY\_REFUNDABLE  
\- 'Combination 6' - all inclusive - 220 € - REFUNDABLE  
  
The returned with maxCombinations = 2 would be:  
\- 'Combination 1' - room only - 100 € - NON\_REFUNDABLE  
\- 'Combination 3' - room only - 150 € - REFUNDABLE  
  
The returned with maxCombinations = 1 (or abscence of value) would be:  
\- 'Combination 1' - room only - 100 € - NON\_REFUNDABLE

Include OnRequest Options

\- This mode returns all available combinations based on its current availability. To include OnRequest options in the response, set the **includeOnRequestOptions** parameter to true. If there is no quota for a specific accommodation configuration but OnRequest quota is available, you will receive a response including those options. If you set the **includeOnRequestOptions** parameter to false, the response will only include accommodations with available quota, excluding all OnRequest options.

Both the **bestCombinations**, **maxCombinations** and **includeOnRequestOptions** parameters are optional. If not provided, the default values are **bestCombinations = true**, **maxCombinations = 1** and **includeOnRequestOptions = true**.

Some considerations about quote:

\- It is important to note that the **auth-token** used in **Quote** calls must be the same throughout the booking flow. The token has an expiration of **120 minutes**, after this time you must start the booking process again from **Quote** or **Quote Single Accommodation** with a new token.

\- The **combinationKey** token expires in **40 minutes** during the quote step and in **60 minutes** in other steps. In each response, the **combinationKey** expiration is refreshed and starts over. After this time, you must start the booking process again from **Quote** or **Quote Single Accommodation** with a new token.

\- In the specific case of searches by accommodation codes, we stronlgly recommend a call of 3000 accommodations instead of doing "N" calls to get the full accommodations results:

\- The **timeout** is represented in milliseconds. Can be used to indicate the maximum waiting time for suppliers to return availability. The total time of the **processTime** request may differ by a few seconds.

Quote accommodations - Request - Accommodation codes - Best combination - Including OnRequest options

```
{
    "checkIn": "2023-06-26",
    "checkOut": "2023-06-30",
    "distributions": [
        {
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 30
                }
            ]
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "filter": {
        "bestCombinations": true,
        "includeOnRequestOptions": true,
        "maxCombinations": 60
    },
    "timeout":5000,
    "accommodations": [
        "1",
        "1000",
        "1003",
    ]
}
```

Quote accommodations - Request - Destination Code - All available combinations - Non including OnRequest options

```
{
    "checkIn": "2023-06-26",
    "checkOut": "2023-06-30",
    "distributions": [
        {
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 30
                }
            ]
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "filter": {
        "bestCombinations": true,
        "includeOnRequestOptions": false
    },
    "timeout":5000,
    "destinationId": "MAD"
}
```

**Quote accomodations - Response**

The availability response, both by accommodation codes and by destination code, has the same response structure.

To proceed with the booking of a combination for an accommodation and call the next step, the [Confirm](#confirmaccommodation) , all that is needed is the **combinationKey**.

Another attribute to consider in the availability response is **quoteSingleNeeded**. This tells you if the accommodation is showing all the available room combinations or if to obtain them you have to call the [Quote Single Accommodation](#quoteSinbleAccommodation) . There may be suppliers who have returned all available combinations, and others who have not. Even if a single provider has not returned all of them, the accommodation will be marked with the attribute as **true**. In any case, **the combinations returned by the accommodation are bookable** and it is not mandatory to call the [Quote Single Accommodation](#quoteSinbleAccommodation) , **although it is advisable to do so**.

Cancellation policies and remarks are informational and, depending on connected providers, may not be available at this step. This information is assured in the [Confirm](#confirmaccommodation) step. You can use the **currentCancellationType** to know the type of cancellation policy applied to each combination at the moment of the quotation. We distinguish four types: **REFUNDABLE, PARTIALLY\_REFUNDABLE, NON\_REFUNDABLE** and **UNKNOWN**. If the combination is **REFUNDABLE** and the provider send us the information, the attribute **deadline** will show the date from wich cancellation penalties will be applied. Again, this conditions may change during the workflow, and to be sure you should check them again in the [Confirm](#confirmaccommodation) step.

If you set **includeOnRequestOptions** to true, the **onRequest** field will reflect the actual availability: false if there is confirmed quota for the accommodation, true if it’s only available on request (no confirmed quota). If you set **includeOnRequestOptions** to false, only accommodations with confirmed quota are returned, so the **onRequest** field will always be false.

```
{
  {
  "auditData": {
    "timestamp": "2024-10-09 07:58:28",
    "processTime": 18099,
    "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJlYm9va2luZ3Rzcy1lQm9va2luZy5BcGkiLCJleHAiOjE3Mjg0NjQyODcsImp0aSI6IkQ0QUU1NEM2LUZBRUQtNDBEOC05QjlGLTFCODU1NTQ1OTYxMCJ9.ggC8C_pNiCUTZvMw4pYbn1vUZqXDLIhCdGKFmmQmBisrYZaYxUtobCXIoPGFY35VzXy-FG1zZ7W7TFhCXyP8bA",
    "traceId": "D4AE54C6-FAED-40D8-9B9F-1B8555459610",
    "availabilityId": 188,
    "server": "http://localhost:30000"
  },
  "total": 2,
  "accommodations": [
    {
      "code": "157117",
      "quoteSingleNeeded": true,
      "combinations": [
        {
          "combinationKey": "157117||14449||RO||d7oNg",
          "rooms": [
            {
              "description": "Studio (2 adults)"
            }
          ],
          "mealPlan": {
            "id": "RO",
            "type": "ROOM_ONLY",
            "description": "ROOM ONLY"
          },
          "onRequest": false,
          "price": {
            "amount": 808.04,
            "currency": "EUR"
          },
          "provider": "Expedia",
          "cancellationPolicies": [
            {
              "date": "2024-10-09",
              "amount": {
                "amount": 0.0,
                "currency": "EUR"
              }
            },
            {
              "date": "2025-06-23",
              "amount": {
                "amount": 444.46,
                "currency": "EUR"
              }
            },
            {
              "date": "2025-06-26",
              "amount": {
                "amount": 808.04,
                "currency": "EUR"
              }
            }
          ],
          "remarks": [],
          "currentCancellationType": {
            "deadline": "2025-06-23",
            "type": "REFUNDABLE"
          }
        }
      ]
    },
    {
      "code": "1088",
      "quoteSingleNeeded": true,
      "combinations": [
        {
          "combinationKey": "1088||14449||RO||YooAN",
          "rooms": [
            {
              "description": "Double Room, Balcony",
              "groupingRoomType": "Room with Balcony"
            }
          ],
          "mealPlan": {
            "id": "RO",
            "type": "ROOM_ONLY",
            "description": "ROOM ONLY"
          },
          "onRequest": false,
          "price": {
            "amount": 657.94,
            "currency": "EUR"
          },
          "provider": "Expedia",
          "cancellationPolicies": [
            {
              "date": "2024-10-09",
              "amount": {
                "amount": 0.0,
                "currency": "EUR"
              }
            },
            {
              "date": "2025-06-23",
              "amount": {
                "amount": 182.1,
                "currency": "EUR"
              }
            },
            {
              "date": "2025-06-26",
              "amount": {
                "amount": 657.94,
                "currency": "EUR"
              }
            }
          ],
          "remarks": [],
          "currentCancellationType": {
            "deadline": "2025-06-23",
            "type": "REFUNDABLE"
          }
        }
      ]
    }
  ]
}
```

This operation will return all available room combinations for an accommodation.

If you need to quote more than one accommodation at the same time use the so-called [Quote Accommodation codes](#quoteaccommodation) , never make several requests in parallel of this call as the times might not be good, it is not the recommended way to use the API to request availability of several accommodations at the same time.

When should I use **Quote single accommodation**?

\- If in the [Quote](#quoteaccommodation) response there is a accommodation with the **quoteSingleNeeded** parameter and you need to retrieve all combinations from that accommodation.

\- If you want to start a booking flow from a specific accommodation.

**Quote accomodations - Request**

Similar to the Quote operation, the request body includes a filter that can be configured to include or exclude OnRequest options.

Include OnRequest Options

\- This mode returns all available combinations based on its current availability. To include OnRequest options in the response, set the **includeOnRequestOptions** parameter to true. If there is no quota for a specific accommodation configuration but OnRequest quota is available, you will receive a response including those options. If you set the **includeOnRequestOptions** parameter to false, the response will only include accommodations with available quota, excluding all OnRequest options.

**includeOnRequestOptions** parameter is optional. If not provided, the default value is **includeOnRequestOptions = true**.

Quote single accommodation - request - Including OnRequest options

```
curl --location --request POST 'http://localhost/resources/booking/accommodations/MASTER-1782232/quote' \
            --header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS11c2VyIiwiZXhwIjoxNjY5MTA5ODU0LCJqdGkiOiJENkE4RUM2MS04NTg0LTRCMzAtQTJDOS03NkQ5NDcyMjg1MjUifQ.fSPEjME4B3HMcqJA5C8YkIBdfRsFRkUggoy3HgwElZIGs2NSegxZnEP7P0OxZx0BTYOlQq4OnuYKBS84fqGyhw' \
            --header 'Accept-Encoding: gzip' \
            --header 'Content-Type: application/json' \
            --data-raw '{
                "checkIn": "2022-06-26",
                "checkOut": "2022-06-30",
                "distributions": [
                    {
                        "persons": [
                            {
                                "age": 30
                            },
                            {
                                "age": 30
                            }
                        ]
                    }
                ],
                "language": "EN",
                "sourceMarket": "ES",
                    "filter": {
                    "includeOnRequestOptions": true
                },
            }'
```

**Quote accomodations - Response**

If you set **includeOnRequestOptions** to true, the **onRequest** field will reflect the actual availability: false if there is confirmed quota for the accommodation, true if it’s only available on request (no confirmed quota). If you set **includeOnRequestOptions** to false, only accommodations with confirmed quota are returned, so the **onRequest** field will always be false.

```
{
    "auditData": {
        "timestamp": "2024-10-09 08:11:38",
        "processTime": 2874,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJlYm9va2luZ3Rzcy1lQm9va2luZy5BcGkiLCJleHAiOjE3Mjg0NjQyODcsImp0aSI6IkQ0QUU1NEM2LUZBRUQtNDBEOC05QjlGLTFCODU1NTQ1OTYxMCJ9.ggC8C_pNiCUTZvMw4pYbn1vUZqXDLIhCdGKFmmQmBisrYZaYxUtobCXIoPGFY35VzXy-FG1zZ7W7TFhCXyP8bA",
        "traceId": "D4AE54C6-FAED-40D8-9B9F-1B8555459610",
        "availabilityId": 943,
        "server": "http://localhost:30000"
    },
    "accommodation": {
        "code": "157117",
        "combinations": [
            {
                "combinationKey": "eyJhbGciOiJIUzI1NiJ9.eyJzdGVwIjoiUVVPVEVEIiwiYXZhaWxhYmlsaXR5SWQiOjk0MywiaG90ZWxJZCI6IjE1NzExNyIsInJhdGVJZCI6IjIwMzM2MDk5NyIsInByb3ZpZGVyUHVyY2hhc2VUb2tlbiI6Ii92My9wcm9wZXJ0aWVzLzQ5NDc4Mjcvcm9vbXMvMjAwNjgyNTYwL3JhdGVzLzIwMzM2MDk5Nz90b2tlbj1Gfk9qb2daeXcwTmhreUFROVBZV1VDWjMwMkQyZ0NDVkFNUzFZUEZBY0NJVEpVQVZRR0dBbFNUZ2RVYzJkeE0yRmtIU0VCSlNFQVZ5SUhGQ1IxZHlJYkJnUnlEeDRQY1FsekdsTjJYUUVCVkFJTkNBTUVCRDVCVVExVkFBZFJBRklWQkZjR0FocFZDd0VNR1FVQVVGc2ZCUXBRQlZBREExb0RBMVFCVkRKUUExMFBEd2xCTkFBQ1ZBTkNaMUstWURFRHEyQThBbFVMVlFuN05Hb0FGRElVVzFzVmNBQUNSc0ExR2pwS1JFQktSRmREQ2hNMkZWOE1JVlJRUUVrVFJscERWaFZZRlRCQlVGWkRHQnRDUVFkYlRWQkVHeGNDQTA0LW5EVXgxak0yVndmZll4WlhVbDFSVlZjS1Z4d0FYUWhVRlFBQlVsTWVWVkZWWGhoV1h3OVRDQU5TRFFkU0JBZXBObUFHVmdJWFhBMkJNR1BRWkRQR09UVzZaMkx5TlRuOE1tZVhZVFdZTWtZRVV3QUpBQUZTVlV4WFZsTlhTQWRjVmxKTEFGUUxBeGtFQWxwV1Yxb0ZBQUVBQjF5R1l5cFhVZ0ZTVEZRREh3TUJNQWtBV0ZVQld3c0lURk1PQ1ZWZUF3TUhVRzdlTURNVVVyNW5NS19uRzNzPSIsInF1b3RlU2luZ2xlTmVlZGVkIjpmYWxzZSwibWVhbFBsYW5JZCI6IlJPIiwibWFya2V0aW5nRmVlIjowLjAsIm5ldFByaWNlIjp7ImFtb3VudCI6NjM0LjMxLCJjdXJyZW5jeSI6IkVVUiJ9LCJwcm92aWRlckNvbmZpZ3VyYXRpb25JZCI6MTQ0NDksInByb3ZpZGVySG90ZWxJZCI6IjQ5NDc4MjciLCJyb29tcyI6W3siZGVzY3JpcHRpb24iOiJTdHVkaW8gKDIgYWR1bHRzKSIsInByb3ZpZGVyRGlzdHJpYnV0aW9uSW5kZXgiOjAsInByb3ZpZGVyUm9vbUNoYXJhY3RlcmlzdGljQ29kZSI6IjIwMDY4MjU2MCJ9XSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEwLTA5IiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTA2LTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6MzQ4LjksImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjUtMDYtMjYiLCJhbW91bnQiOnsiYW1vdW50Ijo2MzQuMzEsImN1cnJlbmN5IjoiRVVSIn19XSwiY2hlY2tJbiI6WzIwMjUsNiwyNl0sImNoZWNrT3V0IjpbMjAyNSw2LDMwXSwic291cmNlTWFya2V0IjoiRVMiLCJhdmFpbGFiaWxpdHlUcmlwTmF0aW9uYWxpdHkiOiJFUyIsImxhbmd1YWdlIjoiRU4iLCJkaXN0cmlidXRpb25zIjpbeyJwZXJzb24iOlt7ImlkIjoiNzk2MjU1MTMiLCJyZXF1ZXN0ZWRBZ2UiOjMwLCJiaXJ0aERhdGUiOiIxOTk0LTA5LTI5In0seyJpZCI6IjQxNDY5MzE5IiwicmVxdWVzdGVkQWdlIjozMCwiYmlydGhEYXRlIjoiMTk5NC0wOS0yOSJ9XX1dLCJyZW1hcmtzIjpbXSwibGFzdEF2YWlsVGltZSI6WzIwMjQsMTAsOSw4LDExLDM4LDkwNzgzOTcwMF0sImV4cGlyYXRpb25EYXRlIjpbMjAyNCwxMCw5LDksMTEsMzgsOTY2NjcyMTAwXSwibmV0Q29tbWlzc2lvbmFibGVQcmljZSI6eyJhbW91bnQiOjAuMCwiY3VycmVuY3kiOiJFVVIifSwiY29tbWlzc2lvblByaWNlQW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fQ.3QuENj0A2i8ifDnkaogECq2ZiZiM_lOPyEnEOyE-aKY",
                "rooms": [
                    {
                        "description": "Studio (2 adults)"
                    }
                ],
                "mealPlan": {
                    "id": "RO",
                    "type": "ROOM_ONLY",
                    "description": "ROOM ONLY"
                },
                "onRequest": true,
                "price": {
                    "amount": 808.04,
                    "currency": "EUR"
                },
                "provider": "Expedia",
                "cancellationPolicies": [
                    {
                        "date": "2024-10-09",
                        "amount": {
                            "amount": 0.0,
                            "currency": "EUR"
                        }
                    },
                    {
                        "date": "2025-06-23",
                        "amount": {
                            "amount": 444.46,
                            "currency": "EUR"
                        }
                    },
                    {
                        "date": "2025-06-26",
                        "amount": {
                            "amount": 808.04,
                            "currency": "EUR"
                        }
                    }
                ],
                "remarks": [],
                "currentCancellationType": {
                    "deadline": "2025-06-23",
                    "type": "REFUNDABLE"
                }
            },
            {
                "combinationKey": "eyJhbGciOiJIUzI1NiJ9.eyJzdGVwIjoiUVVPVEVEIiwiYXZhaWxhYmlsaXR5SWQiOjk0MywiaG90ZWxJZCI6IjE1NzExNyIsInJhdGVJZCI6IjIwMzM2MDk4NCIsInByb3ZpZGVyUHVyY2hhc2VUb2tlbiI6Ii92My9wcm9wZXJ0aWVzLzQ5NDc4Mjcvcm9vbXMvMjAwNjgyNTU4L3JhdGVzLzIwMzM2MDk4ND90b2tlbj1Gfk9qb2daeXcwTmhreUFROVBZV1VDWjMwMkQyZ0NDVkFNUzFZUEZBY0NJVEpVQVZRR0dBbFNUZ2RVYzJkeE0yRmtIU0VCSlNFQVZ5SUhGQ1IxZHlJYkJnUnlEeDRQY1FsekdsTjJYUUVCVkFJTkNBTUVCRDVCVVExVkFBZFJBRklWQkZjR0FocFZDd0VNR1FVQVVGc2ZCUXBRQlZBREExb0RBMVFCVkRKUUExMFBEd2xCTkFBQ1ZBTkNaMUstWURFRHEyQThBbFVMVlFuN05Hb0FGRElVVzFzVmNBQUNSc0ExR2pwS1JFQktSRmREQ2hNMkZWOE1JVlJRUUVrVFJscERWaFZZRlRCQlVGWkRHQnRDUVFkYlRWQkVHeGNDQTA0LW5EVXgxak0yVndmZll4WlhVbDFSVlZjS1Z4d0FYUWhVRlFBQlVsTWVWVkZWWGhoV1h3OVRDQU5TRFFkU0JBZXBObUFJVXdBWFZBS0JNR1BRWkRQR09UVzZaMkx5TlRuOE1tZVhZVFdZTWtZRVV3QUpBQUZTVlV4WFZsTlhTQWRjVmxKTEFGUUxBeGtFQWxwV1Yxb0ZBQUVBQjF5R1l5cFhVZ0ZTVEZRREh3TUJNQWtBV0ZVQld3c0lURk1PQ1ZWZUF3TUhVRzdlTURNVVVyNW5NUFVtUnpvPSIsInF1b3RlU2luZ2xlTmVlZGVkIjpmYWxzZSwibWVhbFBsYW5JZCI6IlJPIiwibWFya2V0aW5nRmVlIjowLjAsIm5ldFByaWNlIjp7ImFtb3VudCI6ODU2LjIsImN1cnJlbmN5IjoiRVVSIn0sInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoxNDQ0OSwicHJvdmlkZXJIb3RlbElkIjoiNDk0NzgyNyIsInJvb21zIjpbeyJkZXNjcmlwdGlvbiI6IlN0dWRpbyAoMyBhZHVsdHMpIiwicHJvdmlkZXJEaXN0cmlidXRpb25JbmRleCI6MCwicHJvdmlkZXJSb29tQ2hhcmFjdGVyaXN0aWNDb2RlIjoiMjAwNjgyNTU4In1dLCJjYW5jZWxsYXRpb25Qb2xpY2llcyI6W3siZGF0ZSI6IjIwMjQtMTAtMDkiLCJhbW91bnQiOnsiYW1vdW50IjowLjAsImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjUtMDYtMjMiLCJhbW91bnQiOnsiYW1vdW50Ijo0NzAuOSwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wNi0yNiIsImFtb3VudCI6eyJhbW91bnQiOjg1Ni4yLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImNoZWNrSW4iOlsyMDI1LDYsMjZdLCJjaGVja091dCI6WzIwMjUsNiwzMF0sInNvdXJjZU1hcmtldCI6IkVTIiwiYXZhaWxhYmlsaXR5VHJpcE5hdGlvbmFsaXR5IjoiRVMiLCJsYW5ndWFnZSI6IkVOIiwiZGlzdHJpYnV0aW9ucyI6W3sicGVyc29uIjpbeyJpZCI6Ijc5NjI1NTEzIiwicmVxdWVzdGVkQWdlIjozMCwiYmlydGhEYXRlIjoiMTk5NC0wOS0yOSJ9LHsiaWQiOiI0MTQ2OTMxOSIsInJlcXVlc3RlZEFnZSI6MzAsImJpcnRoRGF0ZSI6IjE5OTQtMDktMjkifV19XSwicmVtYXJrcyI6W10sImxhc3RBdmFpbFRpbWUiOlsyMDI0LDEwLDksOCwxMSwzOCw5MDczMDM1MDBdLCJleHBpcmF0aW9uRGF0ZSI6WzIwMjQsMTAsOSw5LDExLDM4LDk2NzcxODYwMF0sIm5ldENvbW1pc3Npb25hYmxlUHJpY2UiOnsiYW1vdW50IjowLjAsImN1cnJlbmN5IjoiRVVSIn0sImNvbW1pc3Npb25QcmljZUFtb3VudCI6eyJhbW91bnQiOjAuMCwiY3VycmVuY3kiOiJFVVIifX0.8vwJhbKZv3X2tJSIlpmd-Bulz4sCjlkZ8pUqEHGuWhM",
                "rooms": [
                    {
                        "description": "Studio (3 adults)"
                    }
                ],
                "mealPlan": {
                    "id": "RO",
                    "type": "ROOM_ONLY",
                    "description": "ROOM ONLY"
                },
                "onRequest": false,
                "price": {
                    "amount": 1090.7,
                    "currency": "EUR"
                },
                "provider": "Expedia",
                "cancellationPolicies": [
                    {
                        "date": "2024-10-09",
                        "amount": {
                            "amount": 0.0,
                            "currency": "EUR"
                        }
                    },
                    {
                        "date": "2025-06-23",
                        "amount": {
                            "amount": 599.87,
                            "currency": "EUR"
                        }
                    },
                    {
                        "date": "2025-06-26",
                        "amount": {
                            "amount": 1090.7,
                            "currency": "EUR"
                        }
                    }
                ],
                "remarks": [],
                "currentCancellationType": {
                    "deadline": "2025-06-23",
                    "type": "REFUNDABLE"
                }
            }
        ]
    }
}
```

This operation returns the rate confirmation of the selected combination. This means:

\- Confirmation of cancellation policies

\- All the comments of the rate

\- Returns the required passenger fields for that accommodation. Contact persons refers to the first person of the first distribution and Room Holder refers to the first person of the other distributions

```
{
    "accommodation": {
        "combinationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNpsU01v4jAQ_SuRr5sg54OQcNoUslvUBqI0e1hVHEwyBYskpo5TLUL8944DLLBbDsie9-bNzBvnQFoFOzImaRY_LBZP8ZSYhH0wXrEVr7jaz0oyDj3fJBuhoNI3kkQveZxZ9ihwHNdBvmQKeuQH24Kxk7wAjO6k-OAlyARYlVasmYgSNCd6iq0kjp7T52huTRbTGLnvHapnKDMHKAGl3ljVgknqc26v_vCIzAZU2hcYHwirRdcoMradYOCHlHq-R2079EbYbtFJCU2xx7z4V0aO134monnj6w6b5qIXxozgCj_-ndMLnRCxfkIh6paMXw-khLaQfKdzkfKTyRIaQ8M3E095qyRfdX2BpoQ_ZEyvaIbkfL-DWz-yxSLJf6fxxQ8JxQaK7Z0bxyVOxZoCqqpvPRUVLzic20LvUMyhjmPZtmUP9RrP9lyNogP6vzNH8zbdtahvOfaX6b43cL0hchxKh-HIDb4Q003q1mdoz6vWM33T8S_RRaeuYZdiuBWdLCBhcgtKi7xgZVz4umNr3VE8x3t54-dp3B3IVi8Ajw2rNTGHVvWprZrfRSS8d3iCMtKCrjYASypo9zlXlSYmM_2ekQo1vnsMIKi-679BcdrrRjS4LvRA7s9b--Z6FwBv_uVHtJn_Vjwue1dEXUOjchEV-ihKdn5DZ6A1cOnAP6A0VntDbcBgd8TTbJH-NHOuB9Q2OqZtm_bQDM2haVPTDYIAg5Quj58AAAD__w.vh3mkcYq3bkfEdKPOQUGuwIDsNe-MtCwXtUs5DIXXJs"
    }
}
```

```
{
    "auditData": {
        "timestamp": "2022-11-15 09:05:14",
        "processTime": 69,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
        "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
        "availabilityId": 946,
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "warnings": [
        {
            "type": "PRICE_CHANGE",
            "description": "Price has changed"
        },
        {
            "type": "CANCELLATION_POLICIES_CHANGE",
            "description": "Cancellation policies may have changed, please check"
        }
    ],
    "requiredField": {
        "contactPerson": [
            "FIRST_NAME",
            "LAST_NAME",
            "TITLE",
            "PHONE",
            "EMAIL"
        ],
        "otherPersons": [
            "FIRST_NAME",
            "LAST_NAME",
            "TITLE"
        ,
        "roomHolders": [
            "FIRST_NAME",
            "EMAIL"
        ]
    },
    "accommodation": {
        "code": "MASTER-1782232",
        "giataId": 1312624,
        "name": "Cristine Bedfor Mahón",
        "category": {
            "code": "S4",
            "name": "4 STARS"
        },
        "geolocation": {
            "latitude": 39.887368,
            "longitude": 4.265355
        },
        "checkIn": "2023-06-26",
        "checkOut": "2023-06-30",
        "combination": {
            "combinationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNqUU8FuozAQ_ZXKZxPZxhDgxiZ0G21JIpo9rKocHJgmVghQA9VGVf69Y5Justpe9oZn5j2_98a8k7aDhkRkspjfz7I0mRJK1JvSpdroUnfHWUGiUPqU7OoOSnsiafy0SjKHjwMhXIHzRnUwdO7VHu4ao3PAamPqN12ASUGVy1JVk7oAOxP_SJw0iR-Xj_HcmSymCc6-9sieIc0coACkelFlC5QcLtiB_dsDTlbQLYcLoneiDnVfdSTiIhj5IWPSl4zzUI5Rbt4bA1V-RFzyMyOnq55JXb3obY-idT0QIyK4th_--JShCLE3OKzrQ0ui53dSQJsb3VgsjnxXpoDqzrZvHE912xm96YcLqgJ-k4hduxkOr44N3OaRLRbp6tcy-czDQL6DfP9XGqc1ulJVDmU5SF_Wpc41XGRhdkgmmBAO5w737Bov8VyDYiP2bzInegt3HeY7gn8J9-XIlR7OCMa8cOwGX5BZkVb6DON5tnzUp8L_rC767lp2GZbbujc5pMrsobMkT3gzLnzbq61VlMzxXNzkebbbgGntAvBT21X5UsrQY-EQ3WsP-KiL2BK4aHijTbebnh3yMBwCYh6xvgewCKQch-74v8Br67RUbRfbn2WlD3A2JijnlHs0pB7ljLpBEGCRsfXpAwAA__8.zymnOpa8S5O8gi7dyyzA6LuBBwtq34Wo2fsyrSptw_4",
            "rooms": [
                {
                    "description": "Garden room"
                }
            ],
            "mealPlan": {
                "id": "BH",
                "description": "1 BED AND BREAKFAST + 1 HALF BOARD",
                "providerDescription": "1 bed and breakfast + 1 half board"
                "type": "HALF_BOARD"
            },
            "onRequest": false,
            "price": {
                "amount": 134.05,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "cancellationPolicies": [
                {
                    "date": "2022-11-15",
                    "amount": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2023-06-21",
                    "amount": {
                        "amount": 67.03,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": []
        }
    }
}
```

This operation creates a pre-reservation of the selected combination. Some considerations:

\- The required data of the required guests, indicated in the response of the [Confirm](#confirmaccommodation) operation, must be sent.

\- The distribution sent must match the one requested in the calls of [Quote Accommodations](#quoteaccommodation) or [Quote Single Accommodation](#quoteSinbleAccommodation) as well as the **requestedAge** of each guest.

\- The **requestedAge** must be the passenger's age at the end of the stay.

\- Prebook step is an extra call to the provider to validate that all the information received on the Confirm is correct.

\- This call allows to confirm that all the data received to be booked is correct: price, meal plans, cancelation policies… and we strongly recommend double check this data before the book step

\- Using the **commentToAccommodation** you can send comments to the booked accommodation.

\- Phone Country Code: Some suppliers requested us send them a valid telephone number, so it is necessary and mandatory send the valid code. The format will be always “+” and the code number. It is not allowed to use the “00”.

```
{
    "accommodation": {
        "combinationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNpsU01v4jAQ_SuRr5sg54OQcNoUslvUBqI0e1hVHEwyBYskpo5TLUL8944DLLBbDsie9-bNzBvnQFoFOzImaRY_LBZP8ZSYhH0wXrEVr7jaz0oyDj3fJBuhoNI3kkQveZxZ9ihwHNdBvmQKeuQH24Kxk7wAjO6k-OAlyARYlVasmYgSNCd6iq0kjp7T52huTRbTGLnvHapnKDMHKAGl3ljVgknqc26v_vCIzAZU2hcYHwirRdcoMradYOCHlHq-R2079EbYbtFJCU2xx7z4V0aO134monnj6w6b5qIXxozgCj_-ndMLnRCxfkIh6paMXw-khLaQfKdzkfKTyRIaQ8M3E095qyRfdX2BpoQ_ZEyvaIbkfL-DWz-yxSLJf6fxxQ8JxQaK7Z0bxyVOxZoCqqpvPRUVLzic20LvUMyhjmPZtmUP9RrP9lyNogP6vzNH8zbdtahvOfaX6b43cL0hchxKh-HIDb4Q003q1mdoz6vWM33T8S_RRaeuYZdiuBWdLCBhcgtKi7xgZVz4umNr3VE8x3t54-dp3B3IVi8Ajw2rNTGHVvWprZrfRSS8d3iCMtKCrjYASypo9zlXlSYmM_2ekQo1vnsMIKi-679BcdrrRjS4LvRA7s9b--Z6FwBv_uVHtJn_Vjwue1dEXUOjchEV-ihKdn5DZ6A1cOnAP6A0VntDbcBgd8TTbJH-NHOuB9Q2OqZtm_bQDM2haVPTDYIAg5Quj58AAAD__w.vh3mkcYq3bkfEdKPOQUGuwIDsNe-MtCwXtUs5DIXXJs",
        "commentToAccommodation": "comments received by the accommodation"
    },
    "distributions": [
        {
            "persons": [
                {
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666"
                },
                {
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER"
                }
            ]
        }
    ]
}
```

**Prebook - Response**

```
{
    "auditData": {
        "timestamp": "2022-11-15 09:05:17",
        "processTime": 90,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
        "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
        "availabilityId": 946,
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "warnings": [
        {
            "type": "PRICE_CHANGE",
            "description": "Price has changed"
        },
        {
            "type": "CANCELLATION_POLICIES_CHANGE",
            "description": "Cancellation policies may have changed, please check"
        }
    ],
    "accommodation": {
        "code": "MASTER-1782232",
        "giataId": 1312624,
        "name": "Cristine Bedfor Mahón",
        "category": {
            "code": "S4",
            "name": "4 STARS"
        },
        "geolocation": {
            "latitude": 39.887368,
            "longitude": 4.265355
        },
        "checkIn": "2023-06-26",
        "checkOut": "2023-06-30",
        "combination": {
            "combinationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNpsU01v4jAQ_SuRr5sg54OQcNoUslvUBqI0e1hVHEwyBYskpo5TLUL8944DLLBbDsie9-bNzBvnQFoFOzImaRY_LBZP8ZSYhH0wXrEVr7jaz0oyDj3fJBuhoNI3kkQveZxZ9ihwHNdBvmQKeuQH24Kxk7wAjO6k-OAlyARYlVasmYgSNCd6iq0kjp7T52huTRbTGLnvHapnKDMHKAGl3ljVgknqc26v_vCIzAZU2hcYHwirRdcoMradYOCHlHq-R2079EbYbtFJCU2xx7z4V0aO134monnj6w6b5qIXxozgCj_-ndMLnRCxfkIh6paMXw-khLaQfKdzkfKTyRIaQ8M3E095qyRfdX2BpoQ_ZEyvaIbkfL-DWz-yxSLJf6fxxQ8JxQaK7Z0bxyVOxZoCqqpvPRUVLzic20LvUMyhjmPZtmUP9RrP9lyNogP6vzNH8zbdtahvOfaX6b43cL0hchxKh-HIDb4Q003q1mdoz6vWM33T8S_RRaeuYZdiuBWdLCBhcgtKi7xgZVz4umNr3VE8x3t54-dp3B3IVi8Ajw2rNTGHVvWprZrfRSS8d3iCMtKCrjYASypo9zlXlSYmM_2ekQo1vnsMIKi-679BcdrrRjS4LvRA7s9b--Z6FwBv_uVHtJn_Vjwue1dEXUOjchEV-ihKdn5DZ6A1cOnAP6A0VntDbcBgd8TTbJH-NHOuB9Q2OqZtm_bQDM2haVPTDYIAg5Quj58AAAD__w.vh3mkcYq3bkfEdKPOQUGuwIDsNe-MtCwXtUs5DIXXJs",
            "rooms": [
                {
                    "description": "Garden room"
                }
            ],
            "mealPlan": {
                "id": "BH",
                "description": "1 BED AND BREAKFAST + 1 HALF BOARD",
                "providerDescription": "1 bed and breakfast + 1 half board"
                "type": "HALF_BOARD"
            },
            "onRequest": false,
            "price": {
                "amount": 134.05,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "cancellationPolicies": [
                {
                    "date": "2022-11-15",
                    "amount": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2023-06-21",
                    "amount": {
                        "amount": 67.03,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": [],
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "distributions": [
        {
            "person": [
                {
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666"
                },
                {
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER"
                }
            ]
        }
    ]
}
```

This operation creates a reservation of the rate of the selected combination. Some considerations:

\- The **fakeBooking** attribute is optional. If not sent, the reservation will be closed as BOOKED in the test environment or with the actual state returned by the vendor in the production environment. This attribute is useful if you want to simulate an error, in which case you can send BOOK\_ERROR. Keep in mind that with the **fakeBooking** attribute the reservation will not be persisted in the Travelcompositor system or sent to suppliers if it is in a production environment.

\- The **externalReference** attribute is optional. It can be used to save the customer's reference and thus link it to the generated reservation.

```
{
    "accommodation": {
        "combinationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNpsU01v4jAQ_SuRr5sg54OQcNoUslvUBqI0e1hVHEwyBYskpo5TLUL8944DLLBbDsie9-bNzBvnQFoFOzImaRY_LBZP8ZSYhH0wXrEVr7jaz0oyDj3fJBuhoNI3kkQveZxZ9ihwHNdBvmQKeuQH24Kxk7wAjO6k-OAlyARYlVasmYgSNCd6iq0kjp7T52huTRbTGLnvHapnKDMHKAGl3ljVgknqc26v_vCIzAZU2hcYHwirRdcoMradYOCHlHq-R2079EbYbtFJCU2xx7z4V0aO134monnj6w6b5qIXxozgCj_-ndMLnRCxfkIh6paMXw-khLaQfKdzkfKTyRIaQ8M3E095qyRfdX2BpoQ_ZEyvaIbkfL-DWz-yxSLJf6fxxQ8JxQaK7Z0bxyVOxZoCqqpvPRUVLzic20LvUMyhjmPZtmUP9RrP9lyNogP6vzNH8zbdtahvOfaX6b43cL0hchxKh-HIDb4Q003q1mdoz6vWM33T8S_RRaeuYZdiuBWdLCBhcgtKi7xgZVz4umNr3VE8x3t54-dp3B3IVi8Ajw2rNTGHVvWprZrfRSS8d3iCMtKCrjYASypo9zlXlSYmM_2ekQo1vnsMIKi-679BcdrrRjS4LvRA7s9b--Z6FwBv_uVHtJn_Vjwue1dEXUOjchEV-ihKdn5DZ6A1cOnAP6A0VntDbcBgd8TTbJH-NHOuB9Q2OqZtm_bQDM2haVPTDYIAg5Quj58AAAD__w.vh3mkcYq3bkfEdKPOQUGuwIDsNe-MtCwXtUs5DIXXJs"
    },
    "externalReference": "Client reference"
}
```

```
{
    "auditData": {
        "timestamp": "2022-11-15 09:05:33",
        "processTime": 11230,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
        "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
        "availabilityId": 946,
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "bookingReference": "TST-1464",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "accommodation": {
        "code": "MASTER-1782232",
        "giataId": 1312624,
        "name": "Cristine Bedfor Mahón",
        "category": {
            "code": "S4",
            "name": "4 STARS"
        },
        "geolocation": {
            "latitude": 39.887368,
            "longitude": 4.265355
        },
        "checkIn": "2023-06-26",
        "checkOut": "2023-06-30",
        "bookingReference": "FAKE-1775464987",
        "status": "BOOKED",
        "combination": {
            "rooms": [
                {
                    "description": "Garden room"
                }
            ],
            "mealPlan": {
                "id": "BH",
                "description": "1 BED AND BREAKFAST + 1 HALF BOARD",
                "providerDescription": "1 bed and breakfast + 1 half board"
                "type": "HALF_BOARD"
            },
            "onRequest": false,
            "price": {
                "amount": 134.05,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "cancellationPolicies": [
                {
                    "date": "2022-11-15",
                    "amount": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2023-06-21",
                    "amount": {
                        "amount": 67.03,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": [],
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "distributions": [
        {
            "id": "TST-1464-0",
            "person": [
                {
                    "id": "TST-1464-0-0",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666"
                },
                {
                    "id": "TST-1464-0-1",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER"
                }
            ]
        }
    ]
}
```

With this operation, all available accommodation codes can be retrieved. Please note, that the number of accommodation depends on the connected providers. To recover the detail of the accommodation you must use the so-called [Accommodation detail](#staticaccommodationdetail) or [Accommodations detail](#staticaccommodationsdetail) .

Some considerations:

\- The operation is paginated. The first parameter returns the **first** result and **limit** the number of results for that page.

\- The maximum **limit** value is 20000 accommodations.

\- The **giataId** attribute can be **null** if any connected provider is not in GIATA.  
\*\* A valid giata license is required to use the Accommodation api. If you have any question please contact your **Travel Compositor** account manager.

\- It is recommended to download all accommodations **weekly**.

\- If the **lastUpdate** attribute is prior to the last download it would not be necessary to call **Accommodations details** to retrieve the details of the accommodation since there would be no change in it.

```
curl --location --request GET 'https://online.travelcompositor.com/resources/accommodations?first=0&amp;amp;limit=20000' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS11c2VyIiwiZXhwIjoxNjY4NjczMDkyLCJqdGkiOiJDNTY5QzUwRC1CRTRELTRGNTctQTc4MS1BM0RDREFENzdFNzAifQ.84m3ZQaI-argRhd_OCrmJW4i7Pk9lqB_Mru7u544AaiMKWbkAmP-Oq0oYQ4kuUJ3a9QHu9kOfmxaGanpwfQPgA' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-17 07:53:15",
        "processTime": 1821,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4NjczMzc1LCJqdGkiOiJEQTIyMTYwMi01NTFELTRDMTgtOUM3MS04RDBEQ0Y2RkVCNTQifQ.VT9a94rV3Z3EtTYaAYNS2-2IBQf3exc_WNRvaOR7apy6dmngQMZ0WyuOHX5bgoI0lcqzp1FzStiIrWSOGM3oZQ",
        "traceId": "DA221602-551D-4C18-9C71-8D0DCF6FEB54",
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "accommodations": [
        {
            "id": "1",
            "giataId": 35142,
            "name": "Ohtels Villa Dorada",
            "geolocation": {
                "latitude": 41.06837,
                "longitude": 1.15251
            },
            "countryCode": "ES",
            "lastUpdate": "2022-11-10 09:04"
        },
        {
            "id": "100",
            "giataId": 48555,
            "name": "Hotel Esplendid",
            "geolocation": {
                "latitude": 41.66609,
                "longitude": 2.78053
            },
            "countryCode": "ES",
            "lastUpdate": "2022-10-24 09:47"
        },
        {
            "id": "1000",
            "giataId": 314272,
            "name": "Hotel Palas Pineda",
            "geolocation": {
                "latitude": 41.06788,
                "longitude": 1.17602
            },
            "countryCode": "ES",
            "lastUpdate": "2022-10-30 18:36"
        }
    ],
    "pagination": {
        "firstResult": 0,
        "pageResults": 3,
        "totalResults": 86768
    }
}
```

This operation allows you to retrieve the detailed information of an accommodation using accommodation codes that you should have previously recovered through the [Accommodations](#staticaccommodations) operation and returning in a single request up to a maximum of 100 accommodations. If you need to order only one accommodation you can use the [Accommodations detail](#staticaccommodationsdetail) operation.

```
curl --location --request GET 'https://test-api-accommodation.travelcompositor.com/resources/accommodations/MASTER-2267891/datasheet' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS11c2VyIiwiZXhwIjoxNjY5MDQzOTQ1LCJqdGkiOiJGMkI3M0ZGNi00NDJDLTQyREEtOTNENi1COERFQjZBMDMyQ0MifQ.yFnI88zF2acrGsmQKhA4p1dLIwI4nWq-zzwwmc3A-cSPGUm5ZzOpdHjdlxsj6VRnsrFDK77zUVX-ziBhsxmr8w' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-21 14:56:38",
        "processTime": 5,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS11c2VyIiwiZXhwIjoxNjY5MDQzOTQ1LCJqdGkiOiJGMkI3M0ZGNi00NDJDLTQyREEtOTNENi1COERFQjZBMDMyQ0MifQ.yFnI88zF2acrGsmQKhA4p1dLIwI4nWq-zzwwmc3A-cSPGUm5ZzOpdHjdlxsj6VRnsrFDK77zUVX-ziBhsxmr8w",
        "traceId": "F2B73FF6-442C-42DA-93D6-B8DEB6A032CC",
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "id": "MASTER-2267891",
    "name": "Luxury 6 Bedroom Villa with Superb Sea Views, Mallorca Villa 1014",
    "giataId": 5656,
    "category": "IN",
    "images": [
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ba_001.jpg",
            "width": 5932,
            "height": 3955,
            "classification": {
                "type": "POOL",
                "confidence": 0.6575766205787659
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_001.jpg",
            "width": 5697,
            "height": 3798,
            "classification": {
                "type": "ROOM",
                "confidence": 0.8441494703292847
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_001.jpg",
            "width": 2048,
            "height": 1536,
            "classification": {
                "type": "TERRACE",
                "confidence": 0.4975876808166504
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_001.jpg",
            "width": 4100,
            "height": 2733,
            "classification": {
                "type": "ROOM",
                "confidence": 0.5773656368255615
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_001.jpg",
            "width": 4708,
            "height": 3139,
            "classification": {
                "type": "TERRACE",
                "confidence": 0.6993187665939331
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_l_002.jpg",
            "width": 5044,
            "height": 3363,
            "classification": {
                "type": "TERRACE",
                "confidence": 0.4482262432575226
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_p_002.jpg",
            "width": 5767,
            "height": 3845,
            "classification": {
                "type": "POOL",
                "confidence": 0.9959879517555237
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_002.jpg",
            "width": 5723,
            "height": 3815,
            "classification": {
                "type": "ROOM",
                "confidence": 0.9722800850868225
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_002.jpg",
            "width": 2048,
            "height": 1536,
            "classification": {
                "type": "BEACH",
                "confidence": 0.9819261431694031
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_002.jpg",
            "width": 5293,
            "height": 3529,
            "classification": {
                "type": "LIVING_AREA",
                "confidence": 0.8199681639671326
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_002.jpg",
            "width": 5096,
            "height": 3397,
            "classification": {
                "type": "AERIAL_VIEW",
                "confidence": 0.7925975918769836
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_003.jpg",
            "width": 2048,
            "height": 1536,
            "classification": {
                "type": "TERRACE",
                "confidence": 0.7955818772315979
            }
        },
        {
            "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_003.jpg",
            "width": 4505,
            "height": 3004,
            "classification": {
                "type": "HALLWAY_OR_STAIRCASE",
                "confidence": 0.7949460744857788
            }
        }
    ],
    "facilities": {
        "includedFacilities": [],
        "nonIncludedFacilities": [],
        "otherFacilities": [
            {
                "id": "322-60",
                "priority": 0,
                "icon": "fa-regular fa-grill",
                "description": "BBQ Facilities"
            },
            {
                "id": "420-74",
                "priority": 0,
                "icon": "ico-tc-SPA",
                "description": "Sauna"
            },
            {
                "id": "125-70",
                "priority": 0,
                "icon": "fa-regular fa-flower-daffodil",
                "description": "Garden"
            },
            {
                "id": "90-20",
                "priority": 96,
                "icon": "ico-tc-AIRE",
                "description": "Air conditioned"
            },
            {
                "id": "92-20",
                "priority": 0,
                "icon": "fa-regular fa-heat",
                "description": "Heating"
            }
        ]
    },
    "destination": {
        "code": "PMIoeste",
        "name": "West Mallorca"
    },
    "geolocation": {
        "latitude": 39.52977,
        "longitude": 2.39242
    },
    "description": "Featuring a garden, private pool and mountain views, Luxury 6 Bedroom Villa with Superb Sea Views, Mallorca Villa 1014 is set in Andratx. This villa is 18 km from Golf Santa Ponsa and 32 km from Palma Yacht Club.\n\nLeading onto a balcony with garden views, the air-conditioned villa consists of 6 bedrooms and a fully equipped kitchen.\n\nPlatja Brismar is 2.1 km from the villa, while Cala Marmassen Beach is 2.9 km away. The nearest airport is Palma de Mallorca Airport, 41 km from Luxury 6 Bedroom Villa with Superb Sea Views, Mallorca Villa 1014.\nNo internet access available.\nNo parking available.\nPets are not allowed.\nChildren of any age are allowed.\nNo cots are available.\nNo extra beds are available.",
    "ratings": [
        {
            "source": "Booking.com",
            "numReviews": 0,
            "score": "0.0"
        },
        {
            "source": "Tripadvisor",
            "numReviews": 2,
            "score": "4.5"
        },
        {
            "source": "Expedia",
            "numReviews": 0,
            "score": "0.0"
        }
    ],
    "address": "",
    "accommodationType": "APARTMENT"
}
```

This operation allows you to retrieve the detailed information of an accommodation using accommodation codes that you should have previously recovered through the [Accommodations](#staticaccommodations) operation and returning in a single request up to a maximum of 100 accommodations. If you need to order only one accommodation you can use the [Accommodation detail](#staticaccommodationdetail) operation.

```
curl --location --request GET 'https://test-api-accommodation.travelcompositor.com/resources/accommodations/datasheet?accommodationId=1000&accommodationId=1003&accommodationId=1006&lang=ES' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4NjgxODgzLCJqdGkiOiJEMzQyMDIwRS1CREVBLTRGNkYtOUI2NS05NDQyMTEyNkRFMTYifQ.USqX2ANP2ILumc-krVGooZpkDdCmbPvyAzYhJcUOHUVktibbw-zgoP4dhioQPjYFMPqmj_2qUz-zN2VjNq55LA' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-17 10:18:14",
        "processTime": 17,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4NjgxODgzLCJqdGkiOiJEMzQyMDIwRS1CREVBLTRGNkYtOUI2NS05NDQyMTEyNkRFMTYifQ.USqX2ANP2ILumc-krVGooZpkDdCmbPvyAzYhJcUOHUVktibbw-zgoP4dhioQPjYFMPqmj_2qUz-zN2VjNq55LA",
        "traceId": "D342020E-BDEA-4F6F-9B65-94421126DE16",
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "accommodations": [
                {
                    "id": "1000",
                    "giataId": 314272,
                    "name": "Hotel Palas Pineda",
                    "category": "S4",
                    "images": [
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ba_001.jpg",
                    "width": 5932,
                    "height": 3955,
                    "classification": {
                        "type": "POOL",
                        "confidence": 0.6575766205787659
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_001.jpg",
                    "width": 5697,
                    "height": 3798,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.8441494703292847
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_001.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.4975876808166504
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_001.jpg",
                    "width": 4100,
                    "height": 2733,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.5773656368255615
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_001.jpg",
                    "width": 4708,
                    "height": 3139,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.6993187665939331
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_l_002.jpg",
                    "width": 5044,
                    "height": 3363,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.4482262432575226
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_p_002.jpg",
                    "width": 5767,
                    "height": 3845,
                    "classification": {
                        "type": "POOL",
                        "confidence": 0.9959879517555237
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_002.jpg",
                    "width": 5723,
                    "height": 3815,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.9722800850868225
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_002.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "BEACH",
                        "confidence": 0.9819261431694031
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_002.jpg",
                    "width": 5293,
                    "height": 3529,
                    "classification": {
                        "type": "LIVING_AREA",
                        "confidence": 0.8199681639671326
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_002.jpg",
                    "width": 5096,
                    "height": 3397,
                    "classification": {
                        "type": "AERIAL_VIEW",
                        "confidence": 0.7925975918769836
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_003.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.7955818772315979
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_003.jpg",
                    "width": 4505,
                    "height": 3004,
                    "classification": {
                        "type": "HALLWAY_OR_STAIRCASE",
                        "confidence": 0.7949460744857788
                    }
                }
            ],
            "includedServices": [],
            "nonIncludedServices": [],
            "otherServices": [
                "Playground",
                "NO Accesible para minusválidos",
                "Restaurante",
                "Piscina exterior",
                "Recepción 24h",
                "Alquiler de bicicletas",
                "Sala de reuniones",
                "Animación para niños",
                "Ascensor",
                "Snack / Bar junto piscina",
                "Mini club (Niños)",
                "Piscina interior",
                "Instalaciones para barbacoa",
                "Terraza",
                "Cafetería",
                "Wi-fi",
                "Establecimiento para no fumadores",
                "Parking"
            ],
            "destination": {
                "code": "SAL-3",
                "name": "La Pineda"
            },
            "geolocation": {
                "latitude": 41.06788,
                "longitude": 1.17602
            },
            "description": "Si decides alojarte en Hotel Palas Pineda de Vila-Seca, estarás cerca de la playa, a 3 min a pie de Playa de la Pineda y a 7 de Parque acuático Aquópolis Costa Dorada.  Además, este hotel de 4,5 estrellas se encuentra a 6,9 km de Parque temático PortAventura World y a 0,7 km de Conjunto escultórico \"Marca d'aigua\" en honor de Carlos Barral.\nDisfruta de una gran variedad de instalaciones recreativas, entre ellas una piscina al aire libre, una piscina cubierta y un gimnasio. El servicio de transporte (de pago) te llevará a varios puntos imprescindibles de la zona.\nTe sentirás como en tu propia casa en cualquiera de las 452 habitaciones con aire acondicionado, minibar y televisión de pantalla plana. En tus ratos libres tendrás un televisor con canales por satélite para entretenerte. El baño privado con bañera está provisto de artículos de higiene personal gratuitos y secadores de pelo. Entre las comodidades, se incluyen caja fuerte y escritorio, además de un servicio de limpieza disponible todos los días.\n",
            "ratings": [
                {
                    "source": "Booking.com",
                    "numReviews": 4067,
                    "score": "7.8"
                },
                {
                    "source": "Tripadvisor",
                    "numReviews": 1330,
                    "score": "3.0"
                },
                {
                    "source": "Expedia",
                    "numReviews": 104,
                    "score": "3.9"
                }
            ],
            "phoneNumber": "34-977-370808",
            "address": "Carrer dels Muntanyals, 5",
            "accommodationType": "HOTEL"
        },
        {
            "id": "1003",
            "giataId": 20878,
            "name": "H10 Salauris Palace",
            "category": "S4",
            "images": [
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ba_001.jpg",
                    "width": 5932,
                    "height": 3955,
                    "classification": {
                        "type": "POOL",
                        "confidence": 0.6575766205787659
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_001.jpg",
                    "width": 5697,
                    "height": 3798,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.8441494703292847
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_001.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.4975876808166504
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_001.jpg",
                    "width": 4100,
                    "height": 2733,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.5773656368255615
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_001.jpg",
                    "width": 4708,
                    "height": 3139,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.6993187665939331
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_l_002.jpg",
                    "width": 5044,
                    "height": 3363,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.4482262432575226
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_p_002.jpg",
                    "width": 5767,
                    "height": 3845,
                    "classification": {
                        "type": "POOL",
                        "confidence": 0.9959879517555237
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_002.jpg",
                    "width": 5723,
                    "height": 3815,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.9722800850868225
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_002.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "BEACH",
                        "confidence": 0.9819261431694031
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_002.jpg",
                    "width": 5293,
                    "height": 3529,
                    "classification": {
                        "type": "LIVING_AREA",
                        "confidence": 0.8199681639671326
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_002.jpg",
                    "width": 5096,
                    "height": 3397,
                    "classification": {
                        "type": "AERIAL_VIEW",
                        "confidence": 0.7925975918769836
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_003.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.7955818772315979
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_003.jpg",
                    "width": 4505,
                    "height": 3004,
                    "classification": {
                        "type": "HALLWAY_OR_STAIRCASE",
                        "confidence": 0.7949460744857788
                    }
                }
            ],
            "includedServices": [],
            "nonIncludedServices": [],
            "otherServices": [
                "Playground",
                "Aparcamiento",
                "Terraza",
                "Aperitivos",
                "Wi-fi",
                "Snack / Bar junto piscina",
                "Jardín",
                "Sala de equipaje",
                "Accesible para minusválidos",
                "Biblioteca",
                "Tratamientos Spa",
                "Centro de negocios",
                "Piscina exterior",
                "Bicicletas disponibles",
                "Restaurante",
                "Sala de conferencias",
                "Limpieza en seco y lavandería",
                "Baño para minusválidos",
                "Establecimiento para no fumadores",
                "Tienda",
                "Spa",
                "Parking",
                "Personal multilingüe",
                "Ascensor",
                "Billar",
                "Instalaciones para barbacoa",
                "Sauna",
                "Recepción 24h",
                "Sala de reuniones",
                "Habitaciones minusválidos"
            ],
            "destination": {
                "code": "SAL37",
                "name": "Port Aventura"
            },
            "geolocation": {
                "latitude": 41.07976,
                "longitude": 1.14644
            },
            "description": "Si decides alojarte en H10 Salauris Palace, disfrutarás de una magnífica ubicación en pleno centro de Salou, y apenas te separarán 15 minutos a pie de Parque temático PortAventura World y Oficina de turismo de Salou.  Además, este accommodation de 4 estrellas se encuentra a 1 km de Playa de Llevant y a 1 km de Fuente luminosa.\nRelájate en el spa completo, que ofrece masajes y tratamientos corporales. Si quieres divertirte aquí tienes para elegir, con instalaciones recreativas como una piscina al aire libre, una bañera de hidromasaje y una sauna. Encontrarás también conexión a Internet wifi gratis, servicios de conserjería y una tienda de recuerdos.\nTe sentirás como en tu propia casa en cualquiera de las 351 habitaciones. Las habitaciones disponen de balcón. La conexión a Internet wifi gratis te mantendrá en contacto con los tuyos; también podrás ver tu programa favorito en el televisor con canales por satélite. El baño parcialmente abierto con ducha está provisto de artículos de higiene personal gratuitos y secadores de pelo.\n",
            "ratings": [
                {
                    "source": "Booking.com",
                    "numReviews": 1693,
                    "score": "8.4"
                },
                {
                    "source": "Tripadvisor",
                    "numReviews": 4098,
                    "score": "4.5"
                },
                {
                    "source": "Expedia",
                    "numReviews": 294,
                    "score": "4.2"
                }
            ],
            "phoneNumber": "34-977-38.89.08",
            "chain": "H10 Hotels",
            "address": "Av. Països Catalans, s/n",
            "accommodationType": "HOTEL"
        },
        {
            "id": "1006",
            "giataId": 24129,
            "name": "Villamarina Club (Hotel)",
            "category": "S3",
            "images": [
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ba_001.jpg",
                    "width": 5932,
                    "height": 3955,
                    "classification": {
                        "type": "POOL",
                        "confidence": 0.6575766205787659
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_001.jpg",
                    "width": 5697,
                    "height": 3798,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.8441494703292847
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_001.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.4975876808166504
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_001.jpg",
                    "width": 4100,
                    "height": 2733,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.5773656368255615
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_001.jpg",
                    "width": 4708,
                    "height": 3139,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.6993187665939331
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_l_002.jpg",
                    "width": 5044,
                    "height": 3363,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.4482262432575226
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_p_002.jpg",
                    "width": 5767,
                    "height": 3845,
                    "classification": {
                        "type": "POOL",
                        "confidence": 0.9959879517555237
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_ro_002.jpg",
                    "width": 5723,
                    "height": 3815,
                    "classification": {
                        "type": "ROOM",
                        "confidence": 0.9722800850868225
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_002.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "BEACH",
                        "confidence": 0.9819261431694031
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_002.jpg",
                    "width": 5293,
                    "height": 3529,
                    "classification": {
                        "type": "LIVING_AREA",
                        "confidence": 0.8199681639671326
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_a_002.jpg",
                    "width": 5096,
                    "height": 3397,
                    "classification": {
                        "type": "AERIAL_VIEW",
                        "confidence": 0.7925975918769836
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_s_003.jpg",
                    "width": 2048,
                    "height": 1536,
                    "classification": {
                        "type": "TERRACE",
                        "confidence": 0.7955818772315979
                    }
                },
                {
                    "url": "https://photos.hotelbeds.com/giata/original/15/154868/154868a_hb_w_003.jpg",
                    "width": 4505,
                    "height": 3004,
                    "classification": {
                        "type": "HALLWAY_OR_STAIRCASE",
                        "confidence": 0.7949460744857788
                    }
                }
            ],
            "includedServices": [],
            "nonIncludedServices": [],
            "otherServices": [],
            "destination": {
                "code": "SAL-10",
                "name": "Salou"
            },
            "geolocation": {
                "latitude": 41.0833,
                "longitude": 1.13
            },
            "ratings": [
                {
                    "source": "Booking.com",
                    "numReviews": 295,
                    "score": "6.7"
                },
                {
                    "source": "Tripadvisor",
                    "numReviews": 3157,
                    "score": "4.0"
                },
                {
                    "source": "Expedia",
                    "numReviews": 0,
                    "score": "0.0"
                }
            ],
            "phoneNumber": "977380504",
            "address": "Ciutat de reus, 42",
            "accommodationType": "HOTEL"
        }
    ]
}
```

This operation allows you to recover the cancellation fees of an accommodation reservation on the day and time that the query is made. To cancel the reservation you should use the [Cancel](#cancel) operation.

```
curl --location --request GET 'http://localhost/resources/booking/TST-1538/accommodations/FAKE-2065512443/cancellation-fee' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-17 11:34:16",
        "processTime": 58,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw",
        "traceId": "5BDDC559-DD8E-4A2D-AD11-37F4CE3C9732",
        "availabilityId": 22,
        "server": "http://localhost:30000"
    },
    "cancellationFee": {
        "amount": 150.0,
        "currency": "EUR"
    }
}
```

This operation allows the cancellation of an accommodation reservation. To recover cancellation fees you can use the [Cancellation fees](#cancellationfees) operation.

```
curl --location --request DELETE 'http://localhost/resources/booking/TST-1538/accommodations/FAKE-20655124431' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-17 11:53:23",
        "processTime": 9373,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw",
        "traceId": "5BDDC559-DD8E-4A2D-AD11-37F4CE3C9732",
        "availabilityId": 22,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-1538",
    "externalReference": "Client reference",
    "status": "CANCELED",
    "accommodation": {
        "code": "MASTER-2267891",
        "name": "Luxury 6 Bedroom Villa with Superb Sea Views, Mallorca Villa 1014",
        "category": {
            "code": "IN",
            "name": "0 KEYS"
        },
        "geolocation": {
            "latitude": 39.52977,
            "longitude": 2.39242
        },
        "checkIn": "2023-06-26",
        "checkOut": "2023-06-30",
        "bookingReference": "FAKE-20655124431",
        "status": "CANCELED",
        "combination": {
            "rooms": [
                {
                    "description": "Garden room"
                }
            ],
            "mealPlan": {
                "id": "BH",
                "description": "1 BED AND BREAKFAST + 1 HALF BOARD",
                "providerDescription": "1 bed and breakfast + 1 half board"
                "type": "HALF_BOARD"
            },
            "onRequest": false,
            "price": {
                "amount": 187.16,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "cancellationPolicies": [
                {
                    "date": "2022-11-17",
                    "amount": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2023-06-21",
                    "amount": {
                        "amount": 93.58,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": [],
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "distributions": [
        {
            "id": "TST-1538-0",
            "person": [
                {
                    "id": "TST-1538-0-0",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666"
                },
                {
                    "id": "TST-1538-0-1",
                    "requestedAge": 30
                }
            ]
        }
    ]
}
```

This operation allows you to update the reservation with the latest information that the reservation provider has. An example of use would be: if an accommodation reservation has been closed with status 'On Request', you can use this operation to check if the status has been updated.

In the **test environment**, this operation will always change the booking status to CANCELED.

```
curl --location --request PUT 'http://localhost/resources/booking/TST-1538/accommodations/FAKE-20655124431' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-17 11:42:50",
        "processTime": 215,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw",
        "traceId": "5BDDC559-DD8E-4A2D-AD11-37F4CE3C9732",
        "availabilityId": 22,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-1538",
    "externalReference": "Client reference",
    "status": "CANCELED",
    "accommodation": {
        "code": "MASTER-2267891",
        "name": "Luxury 6 Bedroom Villa with Superb Sea Views, Mallorca Villa 1014",
        "category": {
            "code": "IN",
            "name": "0 KEYS"
        },
        "geolocation": {
            "latitude": 39.52977,
            "longitude": 2.39242
        },
        "checkIn": "2023-06-26",
        "checkOut": "2023-06-30",
        "bookingReference": "FAKE-20655124431",
        "status": "CANCELED",
        "combination": {
            "rooms": [
                {
                    "description": "Garden room"
                }
            ],
            "mealPlan": {
                "id": "BH",
                "description": "1 BED AND BREAKFAST + 1 HALF BOARD",
                "providerDescription": "1 bed and breakfast + 1 half board"
                "type": "HALF_BOARD"
            },
            "onRequest": false,
            "price": {
                "amount": 187.16,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "cancellationPolicies": [
                {
                    "date": "2022-11-17",
                    "amount": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2023-06-21",
                    "amount": {
                        "amount": 93.58,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": [],
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "distributions": [
        {
            "id": "TST-1538-0",
            "person": [
                {
                    "id": "TST-1538-0-0",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666"
                },
                {
                    "id": "TST-1538-0-1",
                    "requestedAge": 30
                }
            ]
        }
    ]
}
```

This operation allows you to retrieve the details of a reservation from the **bookingReference** of the reservation and the **bookingReference** of the property. This operation does not make any calls to the accommodation providers and only retrieves the data that is in Travel Compositor.

```
curl --location --request GET 'http://localhost/resources/booking/TST-1538/accommodations/FAKE-20655124431' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2022-11-17 11:48:44",
        "processTime": 18,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw",
        "traceId": "5BDDC559-DD8E-4A2D-AD11-37F4CE3C9732",
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-1538",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "accommodation": {
        "code": "MASTER-2267891",
        "name": "Luxury 6 Bedroom Villa with Superb Sea Views, Mallorca Villa 1014",
        "category": {
            "code": "IN",
            "name": "0 KEYS"
        },
        "geolocation": {
            "latitude": 39.52977,
            "longitude": 2.39242
        },
        "checkIn": "2023-06-26",
        "checkOut": "2023-06-30",
        "bookingReference": "FAKE-20655124431",
        "status": "BOOKED",
        "combination": {
            "rooms": [
                {
                    "description": "Garden room"
                }
            ],
            "mealPlan": {
                "id": "BH",
                "description": "1 BED AND BREAKFAST + 1 HALF BOARD",
                "providerDescription": "1 bed and breakfast + 1 half board"
                "type": "HALF_BOARD"
            },
            "onRequest": false,
            "price": {
                "amount": 187.16,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "cancellationPolicies": [
                {
                    "date": "2022-11-17",
                    "amount": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2023-06-21",
                    "amount": {
                        "amount": 93.58,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": [],
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "distributions": [
        {
            "id": "TST-1538-0",
            "person": [
                {
                    "id": "TST-1538-0-0",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666"
                },
                {
                    "id": "TST-1538-0-1",
                    "requestedAge": 30
                }
            ]
        }
    ]
}
```

## 1 - Support Multi-Nationality or not?

Yes.

## 2\. Do you support push rate?

No.

## 3\. What\`s the transport data format (XML / JSON)?

Only JSON.

## 4\. Does it support gzip?

Yes, is mandatory.

## 5\. Can the interface transmit bedding type information?

No.

## 6\. Is there any limit on the Max Occupancy?

15 travellers.

## 7\. Support child or not? Age range?

Yes, it is supported. Children's age range goes from 0 till 17 years old (inclusive).

## 8\. Is there any limit on the Max No. of Adults?

15 Adults. 6 per Room as max. occupancy.

## 9\. Is there any limit on the Max No. of Children?

14 Children. 5 per Room. One adult mandatory.

## 10\. Support Multi-Room Booking or not?

Yes.

## 11\. The Maximum Room No. per booking?

4 rooms as maximum.

## 12\. Do you support different Occupancy per room?

Yes.

## 13\. Is there any limit on the Max LOS (length of stay)?

30 Days.

## 14\. Support multi-currency or not?

No.

## 15\. Support multi-Hotel Search or not?

No.

## 16\. Max Accommodations ID per Search?

3000 per search.

## 17\. Support Guest Name for Each Room or not?

No. We can receive the names of all passengers but we only pass on the mandatory information to the suppliers.

## 18\. In the pre book step,will you provide cache rate or real rate?

Depends on connected providers. We are a supplier hub.

## 19\. Which is the time rate?

1 hour.

## 20\. Do you support special request or not? Free Text or structured?

No.

## 21\. Which is the best way to receive more than one combination by accommodation?

In order to receive more than one combination by accommodation on your searches is setting the node **bestCombinations** as **false.** It is important to take into account that there are providers that do not return all the combinations in the Quote call and it will be necessary to make a QuoteSingle to obtain all the combinations.  
All accommodations with the node **quoteSingleNeeded** set up to **true** means that we are only returning one accommodation combination (which will be bookable bypassing the Quote Single Accommodation). If you do not have any provider like this, there is no problem and you will always have quoteSingleNeeded a false.

## 22\. Is it posible to specify in the request if 2 adults go in one room and 1 adult and 1 child in another for example? What is the maximum number of passengers / rooms that they support?

As explained on other questions, you can indicate how many people go in each distribution. In the request, you can indicate **“N”** number of distributions (up to 4 maximum) and in each distribution there are **“N”** people to be included(up to 6 maximum). Each distribution is equivalent to one room of the combinations of each accommodation. The total number of passengers in a reservation is 15.

```
"distributions": [
        {
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 30
                }
            ]
        },{
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 5
                }
            ]
        }
    ]
```

## 23\. Could we specify on the search request which combinations are OnRequest or not?

No, we will always return all the product we have. In any case, if the connected providers do not support "onRequest" it will always be **false**.

## 24\. Can we specify the currency in which we want the results in the availability request? If not, is it possible that we have different currencies in the different combinations?

No, always will be returned the currency whih is set up at microsite configuration and always will be the same.

## 25\. Which is the certification procees to follow?

We will ask you for the request and response of all the calls to verify that the calls are being made correctly. It shouldn't take more than a few days. Ideally, if it were possible to have a staging site to test the flow, that would be great, but it's not required.

We will also request:

\- **A booking with a single room (2 Adults)**

\- **A booking with 2 rooms**

\- **A booking with adults and children**

## 26\. Which booking statuses can be found in your system?

Our system handles statuses at two levels: **booking status** and **service status**. The booking status is calculated from the statuses of the services included in the booking.

**Service statuses:**  
\- **BOOKED** - Service confirmed successfully.  
\- **BOOK\_ERROR** - An error occurred while booking or closing the service.  
\- **CANCELED** - Canceled service.  
\- **PRICE\_ERROR** - The service was booked, but a price change was detected when closing it with the provider. The tolerance to return **BOOKED** can be configured in Microsite Settings. If no value is configured, the system default tolerance is applied.  
\- **NOT\_BOOKED** - The service was not confirmed by the provider.  
\- **RQ** - Service on request, pending provider confirmation.  
\- **PENDING\_BOOK** - The service is still in the booking process.

**Booking statuses:**  
\- **NOT\_BOOKED** - The booking is considered not booked, typically when all services ended in non-confirmed statuses such as **BOOK\_ERROR** or **NOT\_BOOKED**.  
\- **RQ** - At least one service is in **RQ**. Some providers can return **RQ** in the [Book](#bookaccommodation) operation. TravelCApi has a scheduler that checks the status of the booking and updates it when it changes to **BOOKED**. You can check the booking status at any time right after BOOK by calling [Booking details](#bookingdetail) or [Refresh](#refresh) . A booking can be closed in **RQ** even if the availability attribute **onRequest** was **false** during the flow.  
\- **PRICE\_ERROR** - At least one service has a price change error.  
\- **PENDING\_BOOK** - At least one service is still in **PENDING\_BOOK**.  
\- **BOOKED** - All services are in **BOOKED** and there is no previous booking error condition.  
\- **BOOK\_ERROR** - Fallback status when the booking is not fully confirmed and none of the previous cases apply.  
\- **CANCELED** - Canceled booking.

## 27\. Accommodations request shows the results paginated. How should interpret or use correctly the pagintaion filter?

You can find the **first** value and the limit. First is the value in which you want to start (0 is the first position) and **limit** is the pull number.

## 28\. What is the Giata ID meaning?

This is the **GIATA code**. It is the code we use to map the accommodations of all the suppliers we have connected under an unique accommodation. [GIATA Multicodes](http://multicodes.giatamedia.com/webservice/specs/) It is important to highlight that not all accommodation are able to return the Giata Id as it depends on the connected suppliers.  
\*\* A valid giata license is required to use the Accommodation api. If you have any question please contact your **Travel Compositor** account manager.

## 29\. What is the countryCode?

It is the **ISO 3166-1 alpha-2** country code where the accommodation is located.

## 30\. Which are the possible values we can find for hotel categories?

These are the main values you can find in the **category** node: S1, S2, S3, S4, S5, S6, L1, L2, L3, L4, L5, H1, H2, H3, H4, H5, IN  
Where:  
**S** = STARS  
**L** = KEYS  
**H** = SUN  
**IN** = without category/indeterminated

## 31\. ¿Is there any accommodation which return a Thumbail? If not, should we use the first image returned in "images" node?

We don’t have implemented the Thumbail concept, so you can use the first image returned in **images** node

## 32\. The information related to the Ratings comes from Booking.com, TripAdvisor and Expedia. Could we receive this information from other suppliers?

At this moment we have these 3 suppliers and it is not planned to include more in our roadmap

## 33\. In "accommodation facilities"

We return a single list of facilities. Each facility item includes an identifier, a priority, and descriptions in the available languages (for example, EN and ES). For these services, it is not specified whether any additional charges may apply.

## 34\. In "room facilities"

We return a single list under. Each room facility item includes identifier, priority and descriptions by language (for example, EN/ES values).

## 35\. Is there any chance that could get a complete list of the amenities provided to make a mapping with our own amenities?

We could share a full list with the amenities but in the accommodation profile is not shown the ID of them, only the description of each depending on the request language.  
This is dynamic information which can be modified at any time, so we are not completely sure that you can use it properly.

## 36\. Which information can be shown in the “accommodationType” node?

You can get only these 2 values: Hotel or Apartement.

## 37\. Regarding the booking flow: is there any problem if per each services request we get different valid Api token?

For the booking flow it is mandatory to use always the same token.  
For static content request there is no problem at all to use different API token.

## 38\. Do you manage Net Rates?

Yes, but it depends on the configuration of each Microsite and/or credentials connected.

## 39\. Do you manage Commissionable Rates?

Yes, but it depends on the configuration of each Microsite and/or credentials connected. The commission is defined per each credential.

## 40\. In case you manage Net and Commissionable rates, how can we identify them on the responses get?

It is not possible. The information of the rate type will be informed to you once you get your live credentials

## 41\. TravelC allows a price change tolerance at the moment of the booking confirmation. This tolerance can be configured per each Microsite. Which is the value of that tolerance?

Yes, it is something that can be configurable per each Microsite, as per % or fixed value. If it is not specified any value, then the tolerance set by default is 0,5%

## 42\. How can we get the different destination codes (destination ID)?

You can use the following API call: [getDestinations](https://online.travelcompositor.com/api/#/Web%20content/getDestinations) You will be able to get all the destination load for some specific microsite. For our test environment the microsite ID to use is this one: "apiaccommodation"

## 43\. How can we get the full list of valid codes for the node “phonecountryCode”?

We don’t have the list of the codes. This is an standard. We are working directly with the library **com.google.i18n.phonenumbers**

## 44\. Which fields are always mandatory?

There are structural data that will always be mandatory even if they are not provided in the **"requiredField"** of the **"confirm"** response.  
\- **"requestedAge"** is always mandatory.

## 45\. What are the mappings to the required field types?

"courtesyTitle" -> **TITLE**  
"name" -> **FIRST\_NAME**  
"lastName" -> **LAST\_NAME**  
"birthDate" -> **BIRTH\_DATE**  
"documentNumber" -> **DOCUMENT**  
"documentType" -> **DOCUMENT**. Document type has to be **PASSPORT** when the required type is **PASSPORT**  
"email" -> **EMAIL**  
"phoneCountryCode" -> **PHONE**  
"phone" -> **PHONE**  
"countryId" -> **COUNTRY**  
"passportExpirationDate" -> **DOCUMENT\_EXPIRY\_DATE**  
"address" -> **ADDRESS**  
"socialInsuranceNumber" -> **SOCIAL\_INSURANCE\_NUMBER**  
"billingNumber" -> **BILLING\_DOCUMENT**

## 46\. Which passenger data validation errors should be taken into account?

\- Phone incorrect: **The phone is incorrect**  
\- Invalid email format: **The format of the email is invalid**  
\- Duplicate passenger names: **Duplicate passenger names are not allowed (add JR if father and son or similar)**  
\- Birthdate does not match requested age: **Birthdate does not match with the requested age at the end of the trip**  
\- Child age different from availability / order changed: **The 'requestedAge' of any child is different from the 'requestedAge' indicated in the availability, or the order has changed**  
\- Duplicate document: **Duplicate documents are not allowed**  
\- Passport expires before end of trip: **Passport with expiration date before the end of trip**  
\- Document type informed without document number: **Person with document type but without document number**  
\- Different number of persons in distribution / order changed: **The number of persons in a distribution is different from the number indicated in the availability or the order has changed**

TravelC Transport API is designed to provide a set of API calls to bring transport reservation to any website or device:

The TravelC Transport API suite is divided into 2 parts:

\- **Booking flow**

\- **Post-booking**

The number of transports available will depend on the providers connected by the customer.

Use Postman collection to test our APIs now and familiarize yourself with them:

[Postman](https://online.travelcompositor.com/resources/api-transport/TravelC_Api_Transports.postman_collection.json)

If you don't have credentials yet, check out our [Getting started](https://online.travelcompositor.com/api/documentation/index.xhtml#intro) section to help you understand how to get started with the TravelC API

All API responses always return an audit object that the support team might request to trace requests.

```
"auditData": {
    "timestamp": "2022-11-15 09:05:14",
    "processTime": 69,
    "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
    "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
    "availabilityId": 946,
    "server": "http://travelc-host-xxxx:xxxxx"
}
```

Below we show a flowchart with the steps necessary to complete a reservation through the API. Then we will explain each of the steps:

![](https://online.travelcompositor.com/resources/images/api-documentation/booking-transport-flow.png)

This is the first step needed to create a new reservation. There are two types of search:

\- **One Way**: Where only one journey should be requested. (OW)

\- **Round Tryp**: Where two journeys should be requested.Currently open-jaws searches are not supported. (RT)

Depending on the requested parameters, the API will provide you with all the results available for them. Each recommendation represents one OW transport or a RT Transport (the respective fare will be RT fare, or the combination of two OW). On the RT Requests also recommendations of OW are retrieved. These transports can be combined freely as long as there is always one transport for the outbound and one for the inbound. The OW transports for the outbound journey will have the attribute **outboundRef**. For the inbound it will be **inboundRef**. The RT Transports will have both.

The **recommendationKey** can be quite long, and if you plan to store the same at its end, you may need to configure the length of the field accordingly. In any case, we do not recommend storing it since this code changes in each response of the services.

Two kinds of attributes could be used to make a search (they can also be combined):

\- **Destination**: Contact our support team for information on how to retrieve destination codes.

\- **Transport base**: (only airports) Contact our support team for information on how to retrieve transport base codes.

**Quote transports - Request**

It is important to note that the **auth-token** used in **Quote** calls must be the same throughout the booking flow. The token has an expiration of **120 minutes**, after this time you must start the booking process again from **Quote** with a new token.

If you want to know which recommendation has fare family you should include as filter parameter **includeFareFamilies** as true, on response inside recommendations will be **hasFareFamilyUpSell** property that indicates if you could get it's fare families with API call quoteFareFamily.

Quote transport - Request - One way

```
{
    "journeys": [
        {
            "departureDate": "2025-11-30",
            "departure": "MAD",
            "departureType": "TRANSPORT_BASE",
            "arrival": "GRX",
            "arrivalType": "TRANSPORT_BASE"
        }
    ],
    "persons": [
        {
            "age": 30
        },
        {
            "age": 3
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "filter": {
        "includeFareFamilies": true
    }
}
```

Quote transports - Request - Round trip

```
{
    "journeys": [
        {
            "departureDate": "2025-11-26",
            "departure": "BCN",
            "departureType": "TRANSPORT_BASE",
            "arrival": "MAD",
            "arrivalType": "TRANSPORT_BASE"
        },
        {
            "departureDate": "2025-11-30",
            "departure": "MAD",
            "departureType": "TRANSPORT_BASE",
            "arrival": "BCN",
            "arrivalType": "TRANSPORT_BASE"
        }
    ],
    "persons": [
        {
            "age": 30
        },
        {
            "age": 3
        }
    ],
    "language": "EN",
    "includeFareFamilies": true,
    "sourceMarket": "ES"
}
```

**Quote transport - Response**

On the availability response we can find two parts:

\- **Services**: Contains the information of every transport, (Outbound and Inbound on RT searches).

\- **Recommendations**: Contains the prices and fare conditions of each transport.

To proceed with the booking of a recommendation and call the next step, the [Confirm](#confirmtransport) , all that is needed is the **recommendationKey**.

Cancellation policies and remarks are informational and depending on connected providers may not be available at this step. This information will be secured in the step of the [Confirm](#confirmtransport) .

Quote transports - Response - Round Trip

```
{
    "auditData": {
        "timestamp": "2025-10-09 12:37:15",
        "processTime": 2498,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE3NjAwMjA0OTMsImp0aSI6IkM3QURENDgwLTgxNUItNEQ5Ri1CQUMwLTI2OTUxNjU4MTkxMCJ9.PolK7LrGQy5Zb766hssYACLX3_OES_cLucGXoU7NuuF617m3SDq4Oe9ndKOaDeSegHYyRql2ECR1VDFMXnhyHw",
        "traceId": "C7ADD480-815B-4D9F-BAC0-269516581910",
        "availabilityId": 964,
        "server": "http://localhost:30000"
    },
    "services": [
        {
            "ref": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 12:05:00",
            "arrivalDateTime": "2025-11-26 13:35:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:05:00",
                    "arrivalDateTime": "2025-11-26 13:35:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-11111",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:05MADBCNIBFAKE-BCNMAD-111110ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:05:00",
            "arrivalDateTime": "2025-11-30 13:25:00",
            "duration": 80,
            "segments": [
                {
                    "ref": "12:05MADBCNIBFAKE-BCNMAD-111110ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:05:00",
                    "arrivalDateTime": "2025-11-30 13:25:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111110",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:19MADBCNIBFAKE-BCNMAD-111112ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:19:00",
            "arrivalDateTime": "2025-11-30 13:59:00",
            "duration": 100,
            "segments": [
                {
                    "ref": "12:19MADBCNIBFAKE-BCNMAD-111112ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:19:00",
                    "arrivalDateTime": "2025-11-30 13:59:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111112",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:12MADBCNIBFAKE-BCNMAD-111111ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:12:00",
            "arrivalDateTime": "2025-11-30 13:42:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "12:12MADBCNIBFAKE-BCNMAD-111111ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:12:00",
                    "arrivalDateTime": "2025-11-30 13:42:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111111",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:26MADBCNIBFAKE-BCNMAD-111113ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:26:00",
            "arrivalDateTime": "2025-11-30 14:16:00",
            "duration": 110,
            "segments": [
                {
                    "ref": "12:26MADBCNIBFAKE-BCNMAD-111113ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:26:00",
                    "arrivalDateTime": "2025-11-30 14:16:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111113",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 12:15:00",
            "arrivalDateTime": "2025-11-26 14:05:00",
            "duration": 110,
            "segments": [
                {
                    "ref": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:15:00",
                    "arrivalDateTime": "2025-11-26 14:05:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-11113",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:15MADBCNIBFAKE-BCNMAD-111130ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:15:00",
            "arrivalDateTime": "2025-11-30 13:35:00",
            "duration": 80,
            "segments": [
                {
                    "ref": "12:15MADBCNIBFAKE-BCNMAD-111130ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:15:00",
                    "arrivalDateTime": "2025-11-30 13:35:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111130",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:36MADBCNIBFAKE-BCNMAD-111133ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:36:00",
            "arrivalDateTime": "2025-11-30 14:26:00",
            "duration": 110,
            "segments": [
                {
                    "ref": "12:36MADBCNIBFAKE-BCNMAD-111133ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:36:00",
                    "arrivalDateTime": "2025-11-30 14:26:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111133",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:22MADBCNIBFAKE-BCNMAD-111131ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:22:00",
            "arrivalDateTime": "2025-11-30 13:52:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "12:22MADBCNIBFAKE-BCNMAD-111131ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:22:00",
                    "arrivalDateTime": "2025-11-30 13:52:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111131",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:29MADBCNIBFAKE-BCNMAD-111132ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:29:00",
            "arrivalDateTime": "2025-11-30 14:09:00",
            "duration": 100,
            "segments": [
                {
                    "ref": "12:29MADBCNIBFAKE-BCNMAD-111132ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:29:00",
                    "arrivalDateTime": "2025-11-30 14:09:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111132",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "11:50BCNMADUX7706ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 11:50:00",
            "arrivalDateTime": "2025-11-26 13:20:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "11:50BCNMADUX7706ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 11:50:00",
                    "arrivalDateTime": "2025-11-26 13:20:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "7706",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "15:10MADBCNUX7703ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 15:10:00",
            "arrivalDateTime": "2025-11-30 16:35:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "15:10MADBCNUX7703ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 15:10:00",
                    "arrivalDateTime": "2025-11-30 16:35:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "7703",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "07:30MADBCNUX7701ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 07:30:00",
            "arrivalDateTime": "2025-11-30 08:55:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "07:30MADBCNUX7701ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 07:30:00",
                    "arrivalDateTime": "2025-11-30 08:55:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "7701",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "20:30BCNMADUX7708ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 20:30:00",
            "arrivalDateTime": "2025-11-26 22:00:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "20:30BCNMADUX7708ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 20:30:00",
                    "arrivalDateTime": "2025-11-26 22:00:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "7708",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "15:15BCNMADIB414ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 15:15:00",
            "arrivalDateTime": "2025-11-26 16:40:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "15:15BCNMADIB414ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 15:15:00",
                    "arrivalDateTime": "2025-11-26 16:40:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "414",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "07:15MADBCNIB403ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 07:15:00",
            "arrivalDateTime": "2025-11-30 08:30:00",
            "duration": 75,
            "segments": [
                {
                    "ref": "07:15MADBCNIB403ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 07:15:00",
                    "arrivalDateTime": "2025-11-30 08:30:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "403",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "15:55YJBXOCI66160ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 15:55:00",
            "arrivalDateTime": "2025-11-26 18:40:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "15:55YJBXOCI66160ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 15:55:00",
                    "arrivalDateTime": "2025-11-26 18:40:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6160",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T17:18:00",
                            "departureDate": "2025-11-26T17:19:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:20MADBCNIBFAKE-BCNMAD-111140ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:20:00",
            "arrivalDateTime": "2025-11-30 13:40:00",
            "duration": 80,
            "segments": [
                {
                    "ref": "12:20MADBCNIBFAKE-BCNMAD-111140ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:20:00",
                    "arrivalDateTime": "2025-11-30 13:40:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111140",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:31MADBCNIBFAKE-BCNMAD-111123ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:31:00",
            "arrivalDateTime": "2025-11-30 14:21:00",
            "duration": 110,
            "segments": [
                {
                    "ref": "12:31MADBCNIBFAKE-BCNMAD-111123ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:31:00",
                    "arrivalDateTime": "2025-11-30 14:21:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111123",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:24MADBCNIBFAKE-BCNMAD-111122ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:24:00",
            "arrivalDateTime": "2025-11-30 14:04:00",
            "duration": 100,
            "segments": [
                {
                    "ref": "12:24MADBCNIBFAKE-BCNMAD-111122ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:24:00",
                    "arrivalDateTime": "2025-11-30 14:04:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111122",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "14:05XOCYJBI66141ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 14:05:00",
            "arrivalDateTime": "2025-11-30 16:50:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "14:05XOCYJBI66141ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 14:05:00",
                    "arrivalDateTime": "2025-11-30 16:50:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6141",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T15:22:00",
                            "departureDate": "2025-11-30T15:23:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "08:25XOCYJBI66081ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 08:25:00",
            "arrivalDateTime": "2025-11-30 11:10:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "08:25XOCYJBI66081ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 08:25:00",
                    "arrivalDateTime": "2025-11-30 11:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6081",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T09:40:00",
                            "departureDate": "2025-11-30T09:41:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "09:16XOCYJBI66091ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 09:16:00",
            "arrivalDateTime": "2025-11-30 12:01:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "09:16XOCYJBI66091ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 09:16:00",
                    "arrivalDateTime": "2025-11-30 12:01:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6091",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T10:31:00",
                            "departureDate": "2025-11-30T10:32:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:27MADBCNIBFAKE-BCNMAD-111141ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:27:00",
            "arrivalDateTime": "2025-11-30 13:57:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "12:27MADBCNIBFAKE-BCNMAD-111141ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:27:00",
                    "arrivalDateTime": "2025-11-30 13:57:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111141",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:34MADBCNIBFAKE-BCNMAD-111142ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:34:00",
            "arrivalDateTime": "2025-11-30 14:14:00",
            "duration": 100,
            "segments": [
                {
                    "ref": "12:34MADBCNIBFAKE-BCNMAD-111142ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:34:00",
                    "arrivalDateTime": "2025-11-30 14:14:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111142",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "18:35XOCYJBI66181ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 18:35:00",
            "arrivalDateTime": "2025-11-30 21:05:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "18:35XOCYJBI66181ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 18:35:00",
                    "arrivalDateTime": "2025-11-30 21:05:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6181",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:07MADBCNIBFAKE-BCNMAD-111101ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:07:00",
            "arrivalDateTime": "2025-11-30 13:37:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "12:07MADBCNIBFAKE-BCNMAD-111101ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:07:00",
                    "arrivalDateTime": "2025-11-30 13:37:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111101",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:00MADBCNIBFAKE-BCNMAD-111100ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:00:00",
            "arrivalDateTime": "2025-11-30 13:20:00",
            "duration": 80,
            "segments": [
                {
                    "ref": "12:00MADBCNIBFAKE-BCNMAD-111100ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:00:00",
                    "arrivalDateTime": "2025-11-30 13:20:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111100",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:14MADBCNIBFAKE-BCNMAD-111102ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:14:00",
            "arrivalDateTime": "2025-11-30 13:54:00",
            "duration": 100,
            "segments": [
                {
                    "ref": "12:14MADBCNIBFAKE-BCNMAD-111102ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:14:00",
                    "arrivalDateTime": "2025-11-30 13:54:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111102",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:41MADBCNIBFAKE-BCNMAD-111143ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:41:00",
            "arrivalDateTime": "2025-11-30 14:31:00",
            "duration": 110,
            "segments": [
                {
                    "ref": "12:41MADBCNIBFAKE-BCNMAD-111143ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:41:00",
                    "arrivalDateTime": "2025-11-30 14:31:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111143",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "16:40XOCYJBI66161ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 16:40:00",
            "arrivalDateTime": "2025-11-30 19:10:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "16:40XOCYJBI66161ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 16:40:00",
                    "arrivalDateTime": "2025-11-30 19:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6161",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "10:00XOCYJBI66011ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 10:00:00",
            "arrivalDateTime": "2025-11-30 12:45:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "10:00XOCYJBI66011ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 10:00:00",
                    "arrivalDateTime": "2025-11-30 12:45:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6011",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T11:17:00",
                            "departureDate": "2025-11-30T11:18:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:21MADBCNIBFAKE-BCNMAD-111103ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:21:00",
            "arrivalDateTime": "2025-11-30 14:11:00",
            "duration": 110,
            "segments": [
                {
                    "ref": "12:21MADBCNIBFAKE-BCNMAD-111103ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:21:00",
                    "arrivalDateTime": "2025-11-30 14:11:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111103",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "17:25XOCYJBI66171ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 17:25:00",
            "arrivalDateTime": "2025-11-30 20:10:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "17:25XOCYJBI66171ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 17:25:00",
                    "arrivalDateTime": "2025-11-30 20:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6171",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T18:40:00",
                            "departureDate": "2025-11-30T18:41:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:25XOCYJBI66121ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 12:25:00",
            "arrivalDateTime": "2025-11-30 15:10:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "12:25XOCYJBI66121ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 12:25:00",
                    "arrivalDateTime": "2025-11-30 15:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6121",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T13:40:00",
                            "departureDate": "2025-11-30T13:41:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:17MADBCNIBFAKE-BCNMAD-111121ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:17:00",
            "arrivalDateTime": "2025-11-30 13:47:00",
            "duration": 90,
            "segments": [
                {
                    "ref": "12:17MADBCNIBFAKE-BCNMAD-111121ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:17:00",
                    "arrivalDateTime": "2025-11-30 13:47:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111121",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "19:25XOCYJBI66013ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 19:25:00",
            "arrivalDateTime": "2025-11-30 22:10:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "19:25XOCYJBI66013ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 19:25:00",
                    "arrivalDateTime": "2025-11-30 22:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6013",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T20:40:00",
                            "departureDate": "2025-11-30T20:41:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "14:45XOCYJBI66021ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 14:45:00",
            "arrivalDateTime": "2025-11-30 17:37:00",
            "duration": 172,
            "segments": [
                {
                    "ref": "14:45XOCYJBI66021ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 14:45:00",
                    "arrivalDateTime": "2025-11-30 17:37:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6021",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T16:02:00",
                            "departureDate": "2025-11-30T16:03:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "11:25XOCYJBI66111ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 11:25:00",
            "arrivalDateTime": "2025-11-30 14:10:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "11:25XOCYJBI66111ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 11:25:00",
                    "arrivalDateTime": "2025-11-30 14:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6111",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T12:40:00",
                            "departureDate": "2025-11-30T12:41:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "20:25XOCYJBI66201ECONOMY",
            "departure": "XOC",
            "arrival": "YJB",
            "departureDateTime": "2025-11-30 20:25:00",
            "arrivalDateTime": "2025-11-30 23:10:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "20:25XOCYJBI66201ECONOMY",
                    "departure": "XOC",
                    "arrival": "YJB",
                    "departureDateTime": "2025-11-30 20:25:00",
                    "arrivalDateTime": "2025-11-30 23:10:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6201",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-30T21:41:00",
                            "departureDate": "2025-11-30T21:42:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:10MADBCNIBFAKE-BCNMAD-111120ECONOMY",
            "departure": "MAD",
            "arrival": "BCN",
            "departureDateTime": "2025-11-30 12:10:00",
            "arrivalDateTime": "2025-11-30 13:30:00",
            "duration": 80,
            "segments": [
                {
                    "ref": "12:10MADBCNIBFAKE-BCNMAD-111120ECONOMY",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureDateTime": "2025-11-30 12:10:00",
                    "arrivalDateTime": "2025-11-30 13:30:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-111120",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "05:45YJBXOCI66060ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 05:45:00",
            "arrivalDateTime": "2025-11-26 08:28:00",
            "duration": 163,
            "segments": [
                {
                    "ref": "05:45YJBXOCI66060ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 05:45:00",
                    "arrivalDateTime": "2025-11-26 08:28:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6060",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T07:08:00",
                            "departureDate": "2025-11-26T07:09:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "08:40BCNPMIUX6007ECONOMY_10:35PMIMADUX6030ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 08:40:00",
            "arrivalDateTime": "2025-11-26 12:00:00",
            "duration": 200,
            "segments": [
                {
                    "ref": "08:40BCNPMIUX6007ECONOMY",
                    "departure": "BCN",
                    "arrival": "PMI",
                    "departureDateTime": "2025-11-26 08:40:00",
                    "arrivalDateTime": "2025-11-26 09:25:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "6007",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                },
                {
                    "ref": "10:35PMIMADUX6030ECONOMY",
                    "departure": "PMI",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 10:35:00",
                    "arrivalDateTime": "2025-11-26 12:00:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "6030",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "09:50YJBXOCI66010ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 09:50:00",
            "arrivalDateTime": "2025-11-26 12:35:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "09:50YJBXOCI66010ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 09:50:00",
                    "arrivalDateTime": "2025-11-26 12:35:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6010",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T11:13:00",
                            "departureDate": "2025-11-26T11:14:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:40YJBXOCI66130ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 12:40:00",
            "arrivalDateTime": "2025-11-26 15:25:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "12:40YJBXOCI66130ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 12:40:00",
                    "arrivalDateTime": "2025-11-26 15:25:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6130",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T14:03:00",
                            "departureDate": "2025-11-26T14:04:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "07:05YJBXOCI66270ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 07:05:00",
            "arrivalDateTime": "2025-11-26 09:35:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "07:05YJBXOCI66270ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 07:05:00",
                    "arrivalDateTime": "2025-11-26 09:35:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6270",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "08:40BCNPMIUX6007ECONOMY_12:25PMIMADUX6048ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 08:40:00",
            "arrivalDateTime": "2025-11-26 13:50:00",
            "duration": 310,
            "segments": [
                {
                    "ref": "08:40BCNPMIUX6007ECONOMY",
                    "departure": "BCN",
                    "arrival": "PMI",
                    "departureDateTime": "2025-11-26 08:40:00",
                    "arrivalDateTime": "2025-11-26 09:25:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "6007",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                },
                {
                    "ref": "12:25PMIMADUX6048ECONOMY",
                    "departure": "PMI",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:25:00",
                    "arrivalDateTime": "2025-11-26 13:50:00",
                    "marketingCompany": "UX",
                    "operatingCompany": "UX",
                    "transportNumber": "6048",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "19:05YJBXOCI66190ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 19:05:00",
            "arrivalDateTime": "2025-11-26 21:50:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "19:05YJBXOCI66190ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 19:05:00",
                    "arrivalDateTime": "2025-11-26 21:50:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6190",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T20:28:00",
                            "departureDate": "2025-11-26T20:29:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "19:55BCNMADIB422ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 19:55:00",
            "arrivalDateTime": "2025-11-26 21:20:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "19:55BCNMADIB422ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 19:55:00",
                    "arrivalDateTime": "2025-11-26 21:20:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "422",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:10BCNMADIBFAKE-BCNMAD-11112ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 12:10:00",
            "arrivalDateTime": "2025-11-26 13:50:00",
            "duration": 100,
            "segments": [
                {
                    "ref": "12:10BCNMADIBFAKE-BCNMAD-11112ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:10:00",
                    "arrivalDateTime": "2025-11-26 13:50:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-11112",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "20:55YJBXOCI66210ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 20:55:00",
            "arrivalDateTime": "2025-11-26 23:40:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "20:55YJBXOCI66210ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 20:55:00",
                    "arrivalDateTime": "2025-11-26 23:40:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6210",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T22:18:00",
                            "departureDate": "2025-11-26T22:19:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "13:30BCNMADIB412ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 13:30:00",
            "arrivalDateTime": "2025-11-26 14:55:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "13:30BCNMADIB412ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 13:30:00",
                    "arrivalDateTime": "2025-11-26 14:55:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "412",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "18:00BCNMADIB418ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 18:00:00",
            "arrivalDateTime": "2025-11-26 19:25:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "18:00BCNMADIB418ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 18:00:00",
                    "arrivalDateTime": "2025-11-26 19:25:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "418",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "17:35YJBXOCI66180ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 17:35:00",
            "arrivalDateTime": "2025-11-26 20:05:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "17:35YJBXOCI66180ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 17:35:00",
                    "arrivalDateTime": "2025-11-26 20:05:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6180",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "08:55YJBXOCI66090ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 08:55:00",
            "arrivalDateTime": "2025-11-26 11:40:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "08:55YJBXOCI66090ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 08:55:00",
                    "arrivalDateTime": "2025-11-26 11:40:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6090",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T10:18:00",
                            "departureDate": "2025-11-26T10:19:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "16:55BCNMADIB416ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 16:55:00",
            "arrivalDateTime": "2025-11-26 18:20:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "16:55BCNMADIB416ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 16:55:00",
                    "arrivalDateTime": "2025-11-26 18:20:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "416",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "10:50YJBXOCI66110ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 10:50:00",
            "arrivalDateTime": "2025-11-26 13:20:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "10:50YJBXOCI66110ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 10:50:00",
                    "arrivalDateTime": "2025-11-26 13:20:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6110",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "11:50YJBXOCI66020ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 11:50:00",
            "arrivalDateTime": "2025-11-26 14:35:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "11:50YJBXOCI66020ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 11:50:00",
                    "arrivalDateTime": "2025-11-26 14:35:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6020",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T13:12:00",
                            "departureDate": "2025-11-26T13:13:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "14:55YJBXOCI66150ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 14:55:00",
            "arrivalDateTime": "2025-11-26 17:25:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "14:55YJBXOCI66150ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 14:55:00",
                    "arrivalDateTime": "2025-11-26 17:25:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6150",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:20BCNMADIBFAKE-BCNMAD-11114ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 12:20:00",
            "arrivalDateTime": "2025-11-26 14:20:00",
            "duration": 120,
            "segments": [
                {
                    "ref": "12:20BCNMADIBFAKE-BCNMAD-11114ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:20:00",
                    "arrivalDateTime": "2025-11-26 14:20:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-11114",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "12:00BCNMADIBFAKE-BCNMAD-11110ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 12:00:00",
            "arrivalDateTime": "2025-11-26 13:20:00",
            "duration": 80,
            "segments": [
                {
                    "ref": "12:00BCNMADIBFAKE-BCNMAD-11110ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:00:00",
                    "arrivalDateTime": "2025-11-26 13:20:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "FAKE-BCNMAD-11110",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "07:55YJBXOCI66280ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 07:55:00",
            "arrivalDateTime": "2025-11-26 10:25:00",
            "duration": 150,
            "segments": [
                {
                    "ref": "07:55YJBXOCI66280ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 07:55:00",
                    "arrivalDateTime": "2025-11-26 10:25:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6280",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        },
        {
            "ref": "13:45YJBXOCI66014ECONOMY",
            "departure": "YJB",
            "arrival": "XOC",
            "departureDateTime": "2025-11-26 13:45:00",
            "arrivalDateTime": "2025-11-26 16:30:00",
            "duration": 165,
            "segments": [
                {
                    "ref": "13:45YJBXOCI66014ECONOMY",
                    "departure": "YJB",
                    "arrival": "XOC",
                    "departureDateTime": "2025-11-26 13:45:00",
                    "arrivalDateTime": "2025-11-26 16:30:00",
                    "marketingCompany": "I6",
                    "operatingCompany": "I6",
                    "transportNumber": "6014",
                    "transportType": "TRAIN",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": [
                        {
                            "transportBaseCode": "XZZ",
                            "arrivalDate": "2025-11-26T15:08:00",
                            "departureDate": "2025-11-26T15:09:00",
                            "providerTransportBaseDescription": "XZZ"
                        }
                    ]
                }
            ]
        },
        {
            "ref": "12:30BCNMADIB410ECONOMY",
            "departure": "BCN",
            "arrival": "MAD",
            "departureDateTime": "2025-11-26 12:30:00",
            "arrivalDateTime": "2025-11-26 13:55:00",
            "duration": 85,
            "segments": [
                {
                    "ref": "12:30BCNMADIB410ECONOMY",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureDateTime": "2025-11-26 12:30:00",
                    "arrivalDateTime": "2025-11-26 13:55:00",
                    "marketingCompany": "IB",
                    "operatingCompany": "IB",
                    "transportNumber": "410",
                    "transportType": "PLANE",
                    "cabinType": "ECONOMY",
                    "technicalStopsVO": []
                }
            ]
        }
    ],
    "recommendations": [
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 182.36,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:05MADBCNIBFAKE-BCNMAD-111110ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu4kgQ_ZVRP0PkS4CEN3ObRcNtwVlptIqixi5Ib-xuT3c7Myji37fKNrdAJrPah9Fo9wnaVV23c-pgXpixkLE2-_1uGvZ7rMb4MxcJX4pE2M0wZu3b5nWN_aVyLWFjWPvPFxZDxrXNNfS4BbzqOV6j7rp1r4nX90Y0dLqT4yfhJqOn4TyYLGbTefjQCRZ9yqi1eOYJmsZB73C-7L6tvV2A77wqoIz3DwooK_5-Afc1pnK7VLnE6bywTKtnEYPuKrkS61xzK5SkwXnejVdjEuxMiwjIlad4ybJ2w7m6qbEo1xpktMEU_bs5Nka-XZWmwhgMwZcJnN10rpxLFy3_BubM2bvsvCt4DisgE_U4CD71667XuLl2vWaLcIw4WpKk6GamEhEJqNA_nrlTd25oYFXGQ2631bhymufpaXqRklbzyI5VzHcsw0o1GCxL2p4wEQUZcMJwxRMDNbbCwzxPihoIAAlf-abquHJJ1NdIGbs_86gI01Xx7paGlOun6rDkBihFUFQ8Az3jxoBcgy7tCTc2FNETWCHXvdOmXZcd5rjIsywRdK0Y48PibjYbDftzdNFEEqtFtgCuo8d9aeqZ-LJD-qgvZJ3AAWPGQOhESKDqMfCww8qKAtrOUKQnENx-cL2232q7PrG9oiBuLg6Vx7GgE0-QnxaHPocvudAQY0ccc7LZb9MJ7UA4DEf0ORjOF-HDJBjTYRQcvvfHwXDE7o9DFhNbS6LSadB3gmEQvJci1u8JCjXmNNqOc9jKCz5-2698ztXntbgg86TJlLaTPF3uQaujM9oxoFtgSzyBN2BQGei3IKI5ZNRY9ZCVzK1OmKl6UEnL7K4zGnbPQFvy9ZqvYShXCp1858Onj8VGLoXsIglMFa7fnU6m489oWir1hAUdGz8f97pLNwoKrFMaCib4iPzM9qS0ED1KEfFkYVVm_pgSI7cFVAlEFuJOWVVJVGpiwFP8ldhR90uuLGnW4MRSxaYCAxkPjclhwVMIqTJkY9Fy5ZPt9m_MsaiXLUqVkP9GZt_SoP-F9tcS2p-roje_uoqifryrouTjt70LKnrySrZX1R9QUeenyiih9h8UzFgYXJRlXvqhaoI29A3pIWLC2294raZ7S1uFQwZ8-Y8DKtF36MW69GldX7duC_xe-WzvMYXBvwIRjAtkaaaLYqfkOi9aZX2iB3zLRInEq32mJfOLJWugm8TGuo94F-L5QTG2fwN4cBGM.t7J7fPHI07FrFzu6pxSPsintCd8u7VU6seLSlgqTI_Y",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:05MADBCNIBFAKE-BCNMAD-111110ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 328.65,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:19MADBCNIBFAKE-BCNMAD-111112ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJzlV9tu20gM_ZVinu1Al8iO_SbfukZ9q60sUBRBMJZoZzbyjDozSmsE_vclJfkWJ20X-1Bs98kekUMekofH8jMzFjLWZh9vp1G_x2qMP3GR8qVIhd0OE9ZuNa5r7C-Vawlbw9qfn1kCGdc219DjFvCq53hB3XXrXgOvH4xo6HQnp0-ibUZPo3k4Wcym8-i-Ey76lFFr8cRTNI3D3vH8uvuu9jYA33kBoIz3DwCUiL8P4K7GVG6XKpfYnWeWafUkEtBdJVdinWtuhZLUOM-78WpMgp1pEQO58g1esqwdOFc3NRbnWoOMt5iifzvHwsi3qzYbYQyG4MsULm46V85rFy3_BubC2XvdeQ94DisgE9U4CD_0664X3Fy7XqNJc4w5WtK0qGamUhELqKZ_2nOn7txQw6qMx9xuM7hyGpfpqXuxklbz2I5VwvcsQ6QaDMKStidMTEEGnGa44qmBGlvhYZ6nBQYagISvfFtVXLmk6musjD2ceVyE6apkf0vDhuvH6rDkBihFWCCegZ5xY0CuQZf2lBsbifgRrJDr3nnRrsuOfVzkWZYKula08X5xO5uNhv05umgiidUiWwDX8cMBmnoivuwnfVIXsk5ggzFjKHQqJBB6DDzssBJRSNsZic3ZCFrvXK_tN9uuT2yvKIibi03lSSLoxFPkp8Wmz-FLLjQkWBHHnGz2x3RCOxANoxF9DobzRXQ_Ccd0GIXH7_1xOByxu9OQRcfWkqh0HvQHwTAI3tvgrH8kKFSYE7Qd57iVr_j4bb_yuVSfl-KCzJMmU9pO8s3yMLQ6OqMdA7rFbIkn8MYYVAb6rRFRHzIqrHrISuZWJ8xUPaikZXbbGQ27F0Nb8vWar2EoVwqdfOfdh_fFRi6F7CIJTBWu351OpuNPaFoq9YiATo2fTmvdpxuFxaw31BRM8B75mR1IaSF-kCLm6cKqzPw5JUbuilGlEFtIOiWqkqhUxIBv8FdiT90vubKkWYMzSxWbAIYyGRqTw4JvICJkyMai5Mon2-_fmCOo5x1KlZD_RmZ9N7gK3N9caN8q8jcS2l-roq7zX5dRFBCszG19T0bJx28HrUsZPXsnO8jqT8io90t1tBjb_1AyE2FwVZZ56Ye6CdrQN-SHSGjgfuA1G26L9gq7DPj6n4QE0Xfo1br0aV5fN1uuc-mzu8MUBv8MxDAuRks9XRRbJdd5USrrEz_gWybKUbzYaFozv1izAN0kFtZ9wLuQzI-asfsbvisR5A.pSXcNhcDQMEpAbK8NWH-U1uUQebx4rdy_iwEBTheHMg",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:19MADBCNIBFAKE-BCNMAD-111112ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 276.61,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:12MADBCNIBFAKE-BCNMAD-111111ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu40YM_ZXFPNuBLr4kfpNvW2N9q60UWBRBMJZoZxppRjszyq4R-N9LSvItjrst9qHAtk_2iBzykDw8ll-ZsZCxDvv1fhYO-qzG-AsXCV-JRNjtKGadu1ajxv5QuZawNazz-yuLIePa5hr63AJe9RyvWXfdutfC6wcjGrq96emTcJvR03ARTJfz2SJ87AbLAWXUWrzwBE2ToH88v---q10H4DtvAJTx_gGAEvFfA3ioMZXblcoldueVZVq9iBh0T8m12OSaW6EkNc7zbr0ak2DnWkRArjzFS5Z1ms7NbY1FudYgoy2mGNwvsDDy7ak0FcZgCL5K4OKmc-O8d9Hyb2AunL33nfeAF7AGMlGNw-DToO56zduG67XaNMeIoyVJimrmKhGRgGr6pz136s4tNazKeMzttps3TusyPXUvUtJqHtmJivmeZYhUg0FY0vaFiSjIkNMM1zwxUGNrPCzypMBAA5DwlW-riiuXRH2NlLGHM4-KMD0V729pSLl-rg4rboBSBAXiOeg5NwbkBnRpT7ixoYiewQq56Z8X7brs2MdlnmWJoGtFGx-X9_P5eDRYoIsmklgtsiVwHT0doKkX4st-0id1IesENhgzBkInQgKhx8CjLisRBbSdoUjPRnD3wfU6frvj-sT2ioK4udhUHseCTjxBflps-gK-5EJDjBVxzMnmv8ymtAPhKBzT53C0WIaP02BCh3Fw_D6YBKMxezgNWXRsI4lK50G_EwyD4L0UZ_09QaHCnGbHcY5b-Y6P3_Ern0v1eSsuyDxpMqXtNE9Xh6HV0RntGNAtZks8gStjUBnoayOiPmRUWPWQlcytTpipelBJy_y-Ox71Loa24psN38BIrhU6-c6HTx-LjVwJ2UMSmCrcoDebziaf0bRS6hkBnRo_n9a6TzcOilmn1BRM8BH5mR1IaSF6kiLiydKqzPw2I0builElEFmIuyWqkqhUxJCn-Cuxp-6XXFnSrOGZpYpNAAMZj4zJYclTCAkZsrEoufLJ9vs34QjqdYdSJeSPyKzXat40Gz-50F4r8icS2v9V9IdUFPUDCyMhva6i5ON3Gt6lip69kh1U9W-o6L8vo_9BwYyFwUVZ5aUfqiZoQ9-QHiKmeftNr91y72irsMmAL_9xQBB9h16sS592o9G-c51Ln90DpjD4VyCCSTFZ6umy2Cm5yYtS2YDoAd8yUU7izT7TkvnFkjXRTWJhvSe8C_HiqBi7PwGXkBGS.6cWcDmD6NNA3OxPfqXchVbkhjsq6htGjR4VWSVlzVY8",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:12MADBCNIBFAKE-BCNMAD-111111ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 195.55,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:26MADBCNIBFAKE-BCNMAD-111113ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJzlV9tu20gM_ZVinu1AF18Sv8m3rlHfaisLFEUQjCXamY00o86M0hqB_31JSb7FSdvFPhTbfbJH5JCH5OGx_MyMhYx12MfbWTjosxrjT1wkfCUSYbejmHVuWo0a-0vlWsLWsM7nZxZDxrXNNfS5BbzqOV6z7rp1r4XXD0Y0dHvT0yfhNqOn4SKYLuezRXjfDZYDyqi1eOIJmiZB_3h-3X1XexuA77wAUMb7BwBKxN8HcFdjKrcrlUvszjPLtHoSMeiekmuxyTW3QklqnOddezUmwc61iIBceYqXLOs0navrGotyrUFGW0wxuF1gYeTbU2kqjMEQfJXAxU3nynntouXfwFw4e6877wEvYA1kohqHwYdB3fWa1w3Xa7VpjhFHS5IU1cxVIiIB1fRPe-7UnWtqWJXxmNttN6-c1mV66l6kpNU8shMV8z3LEKkGg7Ck7QsTUZAhpxmueWKgxtZ4WORJgYEGIOEr31YVVy6J-hopYw9nHhVheire39KQcv1YHVbcAKUICsRz0HNuDMgN6NKecGNDET2CFXLTPy_addmxj8s8yxJB14o23i9v5_PxaLBAF00ksVpkS-A6ejhAU0_El_2kT-pC1glsMGYMhE6EBEKPgUddViIKaDtDkZ6N4Oad63X8dsf1ie0VBXFzsak8jgWdeIL8tNj0BXzJhYYYK-KYk83_mE1pB8JROKbP4WixDO-nwYQO4-D4fTAJRmN2dxqy6NhGEpXOg_4gGAbBeynO-keCQoU5zY7jHLfyFR-_41c-l-rzUlyQedJkSttpnq4OQ6ujM9oxoFvMlngCb4xBZaDfGhH1IaPCqoesZG51wkzVg0pa5rfd8ah3MbQV32z4BkZyrdDJd959eF9s5ErIHpLAVOEGvdl0NvmEppVSjwjo1PjptNZ9unFQzDqlpmCC98jP7EBKC9GDFBFPllZl5s8ZMXJXjCqByELcLVGVRKUihjzFX4k9db_kypJmDc8sVWwCGMh4ZEwOS55CSMiQjUXJlU-2378JR1DPO5QqIf-NzLrX7au2_7sL7RtF_kZC-2tV1HX_6zKKAoKVea3vySj5NDpu61JGz97JDrL6EzLq_1IdLcb2P5TMWBhclVVe-qFugjb0DfkhYhq43_TaLfeG9gq7DPj6HwcE0Xfo1br0aTca7RvXufTZ3WEKg38GIpgUo6WeLoutkpu8KJUNiB_wLRPlKF5sNK2ZX6xZE90kFtZ7wLsQL46asfsbJQ8R9Q.kLPhedyJs0dnXPKYsZipjkmBA7DTsk2-ikvaneyWriU",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:05BCNMADIBFAKE-BCNMAD-11111ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:26MADBCNIBFAKE-BCNMAD-111113ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 93.24,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:15MADBCNIBFAKE-BCNMAD-111130ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu4kgQ_ZVRP0PkC4TLm7nNouG2QFYaraKosQvSG7vb093ODIr4962yzS2Qyaz2YTTafYJ2VVedqjp1MC_MWEhZm_1-N132e6zC-DMXMV-JWNjtMGLt1m2twv5SmZawNaz95wuLIOXaZhp63AJe9RyvXnXdqneL1w9GNHS6k9Mny21KT5fzYLKYTefLh06w6FNGrcUzj9E0DnrH83X3XeVtAL7zCkAR7x8AKBB_H8B9hanMrlQmsTsvLNXqWUSgu0quxSbT3AolqXGe1_QqTIKdaRECufIEL1nW9p3GjY9dDTOtQYZbTNK_m2Np5N1VSSKMwSB8FcPFXefGuXbR8m9gLpy96857yHNYA5moykHwqV91vXqz5nq3DZpkyNESx3k9MxWLUEA5_9OuO1WnSS0rMx5zN1s3dfcyO7UvVNJqHtqxivieZghUg0FU0vaECSnGgNMQ1zw2UGFrPMyzOIdAE5DwlW_LgkuXWH0NlbGHMw_zMF0V7W9pSLh-Kg8rboBSBDngGegZNwbkBnRhj7mxSxE-gRVy0zuv2XXZsY2LLE1jQdfyLj4s7maz0bA_RxdNLLFapAvgOnw8QFPPRJj9oE_qQtoJ7C9mDISOhQRCj4GHHVYgCmg9lyI5m0Drg-u1_Ubb9YnuJQdZ23WxqzyKBB15jAy12PU5fMmEhghL4piUzX6bTmgLlsPliD4Hw_li-TAJxnQYBcfv_XEwHLH705B5yzaSqHQe9J1gGATvJTjs9ySFKnPrbcc57uUVn1rbKX0u9ee1vCD1pEmVtpMsWR2mVkVntGNAN-8iEQXemINKQb81I-pDSoWVD1lB3fKEmcoHpbjM7jqjYfdyaiu-2fANDOVaoZfvfPj0MV_JlZBdpIEp4_W708l0_BlNK6WeENGp8fNpsft8oyAfdkJdwQQfkaHpgZYWwkcpQh4vrErNH1Pi5C6fVQyhhahToCqoSlUMeII_FHvyfsmUJdEanFnK2AQwkNHQmAwWPIElIUM65jWXPul-A8ccQb3sUKuE_DdK-4YI_S-0v5TQ_lwVbf7qIorq8a6Iko_f9q-I6Nk72UFUf0BEnZ-qojS1_6BcRsLgoqyywg81E7Shb0gPEdG8_brXuHVbtFXYZMC3_yggiL5Db9aFT6NWa7Rc59Jnd48pDP4XCGGcT5Z6ush3Sm6yvFTWJ3rAt1QUk3i1z7Rkfr5kdXSTWFj3Ee9CND8qxu5vT_oRww.15qdiA8OfQ9sbPBFcaekc7K3cCeY1nz8Whz-Z9iwMcE",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:15MADBCNIBFAKE-BCNMAD-111130ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 55.78,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:36MADBCNIBFAKE-BCNMAD-111133ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu20gM_ZVinu1AF18Svcm3rlHfaisLFEUQjCXamY08o86M0hqB_31JSb7FSdtFXxbdfbJH5JCH5OGx_MyMhYwF7OPtNOr3WI3xJy5SvhSpsNthwoKbVqPG_lK5lrA1LPj8zBLIuLa5hh63gFc9x2vWXbfutfD6wYiGTndy-iTaZvQ0moeTxWw6j-474aJPGbUWTzxF0zjsHc-vu-9qbwPwnRcAynj_AECJ-PsA7mpM5XapcondeWaZVk8iAd1VciXWueZWKEmN87xrr8Yk2JkWMZAr3-AlywLfaV_52NU41xpkvMUk_ds5lkbeXbXZCGMwCF-mcHHXuXJeu2j5NzAXzt7rznvIc1gBmajKQfihX3e95nXD9VptmmTM0ZKmRT0zlYpYQDX_0647deeaWlZlPOa-vrlqupfZqX2xklbz2I5Vwvc0Q6AaDKKStidMTDEGnIa44qmBGlvhYZ6nBQSagISvfFsVXLmk6musjD2ceVyE6apkf0vDhuvH6rDkBihFWACegZ5xY0CuQZf2lBsbifgRrJDr3nnNrsuObVzkWZYKulZ08X5xO5uNhv05umhiidUiWwDX8cMBmnoiwuwHfVIX0k5gfzFjKHQqJBB6DDzssBJRSOsZic3ZBG7euV7gtwPXJ7pXHGSB62JXeZIIOvIUGWqx63P4kgsNCZbEMSmb_TGd0BZEw2hEn4PhfBHdT8IxHUbh8Xt_HA5H7O40ZNGytSQqnQf9QTAMgvc2OOwfSQpV5jYDxznu5Ss-jcCpfC7156W8IPWkyZS2k3yzPEytjs5ox4Bu0UUiCrwxB5WBfmtG1IeMCqsespK61QkzVQ8qcZnddkbD7uXUlny95msYypVCL9959-F9sZJLIbtIA1PF63enk-n4E5qWSj0iolPjp9Ni9_lGYTHsDXUFE7xHhmYHWlqIH6SIebqwKjN_TomTu2JWKcQWkk6JqqQqVTHgG_yh2JP3S64sidbgzFLFJoChTIbG5LDgG4gIGdKxqLnyyfYbOOYI6nmHWiXkryht079qNn9zoX2jxt9IaP9X0V9TUZQPqqz1PRUln0bgtS5V9Oyl7KCqP6Gi_wIZ_Q8KZiIMrsoyL_1QNUEb-ob8EAkN3G967ZZ7Q3uFXQZ8_09Cgug79G5d-rQbjfaN61z67O4whcF_AzGMi9FSTxfFVsl1XpTK-sQP-JaJchQvNprWzC_WrIluEgvrPuBdSOZHzdj9DX5fEhQ.bXPjRdH0gFQPLESDyTZVj0h_FweZB9XQ65GfEEL2sS0",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:36MADBCNIBFAKE-BCNMAD-111133ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 106.92,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:22MADBCNIBFAKE-BCNMAD-111131ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJzlV9tu20gM_ZVinu1AFzuO9SbfukZ9q60sUBRBMJZoZzbyjDozSmsE_vclJfkWJ20X-1Bs98kekUMekofH8jMzFjIWsI-306jfYzXGn7hI-VKkwm6HCQva140a-0vlWsLWsODzM0sg49rmGnrcAl71HK9Zd926d43XD0Y0dLqT0yfRNqOn0TycLGbTeXTfCRd9yqi1eOIpmsZh73h-3X1XexuA77wAUMb7BwBKxN8HcFdjKrdLlUvszjPLtHoSCeiukiuxzjW3QklqnOfdeDUmwc60iIFc-QYvWRb4TuvKx67GudYg4y0m6d_OsTTy7qrNRhiDQfgyhYu7zpXz2kXLv4G5cPZed95DnsMKyERVDsIP_brrNW8arnfdoknGHC1pWtQzU6mIBVTzP-26U3duqGVVxmPum_ZV073MTu2LlbSax3asEr6nGQLVYBCVtD1hYoox4DTEFU8N1NgKD_M8LSDQBCR85duq4MolVV9jZezhzOMiTFcl-1saNlw_VoclN0ApwgLwDPSMGwNyDbq0p9zYSMSPYIVc985rdl12bOMiz7JU0LWii_eL29lsNOzP0UUTS6wW2QK4jh8O0NQTEWY_6JO6kHYC-4sZQ6FTIYHQY-Bhh5WIQlrPSGzOJtB-53qB3wpcn-hecZAFrotd5Uki6MhTZKjFrs_hSy40JFgSx6Rs9sd0QlsQDaMRfQ6G80V0PwnHdBiFx-_9cTgcsbvTkEXL1pKodB70B8EwCN7b4LB_JClUmdsMHOe4l6_4NAKn8rnUn5fygtSTJlPaTvLN8jC1OjqjHQO6RReJKPDGHFQG-q0ZUR8yKqx6yErqVifMVD2oxGV22xkNu5dTW_L1mq9hKFcKvXzn3Yf3xUouhewiDUwVr9-dTqbjT2haKvWIiE6Nn06L3ecbhcWwN9QVTPAeGZodaGkhfpAi5unCqsz8OSVO7opZpRBbSDolqpKqVMWAb_CHYk_eL7myJFqDM0sVmwCGMhkak8OCbyAiZEjHoubKJ9tv4JgjqOcdapWQ_0ZpXce7uv7dlfatIn8jqf21Otr-r8so6gcW5nnfk1Hy8YOmdymjZ29lB1n9CRl1f6mO0tT-h4KZCIOLssxLP1RN0Ia-IT1EQvP2m17r2m3TVmGTAd__k5Ag-g69W5c-rUaj1XadS5_dHaYw-G8ghnExWerpotgpuc6LUlmf6AHfMlFO4sU-05L5xZI10U1iYd0HvAvJ_KgYu78BnMUSDw.kktfnORVAUQnyllHPOXUqUecBFrXUBiFFNnunBsH3SU",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:22MADBCNIBFAKE-BCNMAD-111131ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 166.67,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:29MADBCNIBFAKE-BCNMAD-111132ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJzlV9tu20gM_ZVinu1Akm-x3-Rb16hvtZUFiiIIxhLtzEaaUWdGaY3A_76kJN9ip-1iH4rtPtkjcshD8vBYfmHGQso67OPdLBj0WYXxZy5ivhKxsNtRxDrtZr3C_lKZlrA1rPP5hUWQcm0zDX1uAa96jteoum7Va-L1gxEN3d709EmwTelpsPCny_lsETx0_eWAMmotnnmMponfP56vu-8qbwOoOa8AFPH-AYAC8fcB3FeYyuxKZRK788JSrZ5FBLqn5FpsMs2tUJIa53m3XoVJsHMtQiBXnuAlyzo1p3VTw66GmdYgwy0mGdwtsDTy7qkkEcZgEL6K4eKuc-Ncu2j5NzAXzt515z3kBayBTFTl0P8wqLpe47bues0WTTLkaInjvJ65ikUooJz_adedqnNLLSszHnPftm8a7mV2al-opNU8tBMV8T3NEKgGg6ik7QsTUowhpyGueWygwtZ4WGRxDoEmIOEr35YFly6x-hoqYw9nHuZheira39KQcP1UHlbcAKXwc8Bz0HNuDMgN6MIec2MDET6BFXLTP6_ZddmxjcssTWNB1_IuPizv5vPxaLBAF00ssVqkS-A6fDxAU89EmP2gT-pC2gnsL2b0hY6FBEKPgUddViDyaT0DkZxNoP3O9Tq1VsetEd1LDrKO62JXeRQJOvIYGWqx6wv4kgkNEZbEMSmb_zGb0hYEo2BMn8PRYhk8TP0JHcb-8ftg4o_G7P40ZN6yjSQqnQf9QTAMgvcSHPaPJIUqcxsdxznu5RWfescpfS7157W8IPWkSZW20yxZHaZWRWe0Y0A37yIRBd6Yg0pBvzUj6kNKhZUPWUHd8oSZygeluMzvuuNR73JqK77Z8A2M5FqhV8159-F9vpIrIXtIA1PGG_Rm09nkE5pWSj0holPjp9Ni9_nGfj7shLqCCd4jQ9MDLS2Ej1KEPF5alZo_Z8TJXT6rGEILUbdAVVCVqhjyBH8o9uT9kilLojU8s5SxCaAvo5ExGSx5AgEhQzrmNZc-6X4DJxxBvexQq4T8N0rrNlEvr6jQb6W0bxX5G0ntL9ZR57-uoyggWJnX_p6Okg_qaPtSR89eyw66-hM66v1aIaWx_Q8lMxIGV2WVFX6om6ANfUN-iIgGXmt4rabbpr3CLgP-A4h8glhz6O268GnV662261z67O4xhcH_AyFM8tFST5f5VslNlpfKBsQP-JaKYhSvNprWrJavWQPdJBbWe8S7EC2OmrH7G8zwEmA.I8y3tvPiaZ1M2o-A6gbUVmw534J4_3sgppYHelMnD94",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:15BCNMADIBFAKE-BCNMAD-11113ECONOMY",
                    "baggageAllowance": "30 KG"
                },
                {
                    "segmentRef": "12:29MADBCNIBFAKE-BCNMAD-111132ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 180.69,
                    "currency": "EUR"
                }
            },
            "outboundRef": "11:50BCNMADUX7706ECONOMY",
            "hasFareFamilyUpSell": true,
            "inboundRef": "15:10MADBCNUX7703ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu4zYQ_ZWAz85CsmIr0ZssO10DvtVWiiZFsKClscNGIrUkla0R5N87I8vXxHvB7kuKPsUk53Jm5sxx_MyMhYIF7PebcdzrsgbjT1xkfC4yYVf9lAVX7YsG-1uVWsLKsOCvZ5ZCwbUtNXS5BXRtOs3WueueN9vovn3Eh0402r-JVwXdxtNwNJuMp_GnTjjrUUatxRPP8GkYdnfnt81fGqcBeM4RgHW8HwCwRvx1APcNpko7V6XE7jyzQqsnkYKOlFyIZam5FUpS41pO22swCXaiRQJkynN0sixwPjgNlpRag0xWmKF3M8W6yDRSeS6MwQh8nsH3Om4gTGEB9ESo3RYWknA8ZFkFaaIykQioR7jfOOfcuaSq6yS7dK7vfbhov85ILUiUtJondqhSvqEKgtNgEIm0XWESCnLNaRALnhlosAUepmVWYbjfg43tFHJJEZiLQJSEL3xVF1-7ZupLoozdnnlShY9UuommIef6sT7MuQFKHVaVTEBPuDEgl6Cr8ovNifwxa9iN2c5pvwUX_lstJxIex4g-_lgIRJlxY2ORPAKV3z0ciUtcpoZ1uBFYFRt1b29bA7zcJiZ-7go4rwBooqXVopgB18nDtl_qiYBuyLU3BOS5QDYggFDoTMhNxJs_2RpgSHoQi_yAL1dnbjPw_KBiWVqTHrUCC-VpKujEM9wIiwyZwudSaEixQI452eTjeERbF_fjAf297k9n8adROKTDINx97g3D_oDd74esxriURPXDoN8IhkHQL0difkvCzlwXNzdwnJ0OvGHjBc3a5rXeHcsZrok0hdJ2VOZzIiDzfYekkvgKJzqvCtCnpkKlF1RLfelf-jVX6ostVeiuVrHJTWfQj15Na86XS76EvlwoNHImUaUacyEjnL2p4_Wi8Wg8vCV-K_WIoPYfR_slbpINwmrEOfUCw_-GtCy2XLSQPEiR8GxmVWH-GBMRX6oJZZBYSDtrTGt-UgnXPMevow1jP5fKkjpeH7xYXcIaXyjTvjElzHgOMQFDDlb11um3-zPkiOkZl5kJ-TNyfkomf7Wie-9S0Zv_K_oJRb97B4p-2Xrniu45Z24rcL-q6GTTDrzWa0U_-Id0q_BvKrr3SxX96lDR775P0WlaP6_od_8BRU-FwZ2Zl2s73G3Qhj4hU0SlSl6r6bddarPG7gP-CkpDQug5JAVrG__iwr-q1vbI5uUeUxj8TZTAsBo5tXRWrZdcllWlrEdMgX8KsR7OkRjQvnnbfZNYWPSAvpBOd6L38i9cKGs_.x-d3iQDe7bmHnzesFWB7asjjl6BaAzB9hMuds7uJ1Rc",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "11:50BCNMADUX7706ECONOMY",
                    "baggageAllowance": "0 PC"
                },
                {
                    "segmentRef": "15:10MADBCNUX7703ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 207.77,
                    "currency": "EUR"
                }
            },
            "outboundRef": "11:50BCNMADUX7706ECONOMY",
            "hasFareFamilyUpSell": true,
            "inboundRef": "07:30MADBCNUX7701ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJzdV9tu4kgQ_ZWon8nIxoCBN3PJDhK3BWe10SoaNXZBemN3e7rbmUFR_n2rjLkGZiaarLSzT6G763Kq6tQhPDNjIWNt9vvtJOz3WIXxJy4SvhCJsOtBzNqtRq3C_la5lrA2rP3XM4sh49rmGnrcArpWnWr92nWvqw103z3iQ6c7PrwJ1xndhrNgPJ9OZuGnTjDvU0atxRNP8GkU9Pbn8-YvlcsAPOcEwCbeGwBsEH8bwH2FqdwuVC6xO88s0-pJxKC7Si7FKtfcCiWpcXWn4VWYBDvVIgIy5Sk6WdZ2PjgVFuVag4zWmKF_O8O6yLSr0lQYgxH4IoEfddxCmMES6IlQu3UsJOJ4SJIC0lQlIhJQjvCwcc6106SqyyT7dK7vfag1XmekFkRKWs0jO1Ix31IFwWkwiETanjARBbnhNIglTwxU2BIPszwpMNwfwMZ2CrmiCMxFIErCF74uiy9dE_UlUsbuzjwqwndVvI2mIeX6sTwsuAFKHRSVTEFPuTEgV6CL8rPtifwxa9AL2d7psAU1_1zLiYSnMbof3xYCUSbc2FBEj0Dl945H4hKXqWEdbgRWxca9u7v6EC93iYmf-wKuCwCaaGm1yObAdfSw65d6IqBbch0MAXkukA0IIBA6EXIb8fZPtgEYkB6EIj3iS-vKrbY9v12wLC5Jj1qBhfI4FnTiCW6ERYbM4HMuNMRYIMecbPpxMqatCwfhkP7eDGbz8NM4GNFhGOw_90fBYMjuD0MWY1xJovpx0O8EwyDolyIxvydhV66Lm9t2nL0OnLHx2tXS5rXencoZrok0mdJ2nKcLIiDzfYekkvgKFzqvMtCXpkKlZ1RLeek3_ZIr5cWOKnRXqtj0tjMcdF9Na8FXK76CgVwqNHKm3UI1FkJ2cfamjNfvTsaT0R3xW6lHBHX4OD4scZtsGBQjTqkXGP43pGW246KF6EGKiCdzqzLzx4SI-FJMKIHIQtzZYNrwk0q44Sl-HW0Z-zlXltTx5ujF6hw2-AIZD4zJYc5TCAkYcrCot0y_258RR0zPuMxMyJ-Rc7fVOiuT763otXdQ9AtQ_0VFr_7HFL1xtuVvUvQLId6q6MEvoOjN-i-u6J5z5fht75uKTjbNdr3-WtGP_iHdKfxZRXffVdGbx4oe_Jii07R-XtGD_4Gix8LgzizyjR3uNmhDn5ApolAlr171G26LFgy7D_grKA4IoeeQFGxs_FrNbxVre2Lzco8pDP4mimBUjJxaOi_WS67yolLWJ6bA10xshnMiBrRv3m7fJBbWfUBfiGd70Xv5B99kav4.nNLJzWSevEpPfcWgNuzJNSs_gsO3ol3PPCQpSMR3t9I",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "11:50BCNMADUX7706ECONOMY",
                    "baggageAllowance": "0 PC"
                },
                {
                    "segmentRef": "07:30MADBCNUX7701ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 232.77,
                    "currency": "EUR"
                }
            },
            "outboundRef": "20:30BCNMADUX7708ECONOMY",
            "hasFareFamilyUpSell": true,
            "inboundRef": "15:10MADBCNUX7703ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu2zgQ_ZWAz04hS7Gd6E2Wna0B32oriyZFUNDSxOFGIlWSSmsE-fedkeRr4l7QvmSxTzHJuZyZOXMcPzFjIWc--3A1ifo91mD8kYuUL0Qq7GqQMP-ifdZg_6hCS1gZ5n96YgnkXNtCQ49bQFfXcVunzeap20b3zSM-dMPx7k20yuk2mgXj-XQyiz53g3mfMmotHnmKT6Ogtz2_bv7cOA7Acw4AVPF-AUCF-PsAbhtMFXahCondeWK5Vo8iAR0qeSeWheZWKEmNazltr8Ek2KkWMZApz9DJMt955zRYXGgNMl5hhv7VDOsi01BlmTAGI_BFCj_ruIYwgzugJ0LdpGHEHA9pWkKaqlTEAuoR7jbOOXXOqeo6yTad63rvztovM1ILYiWt5rEdqYSvqYLgNBhEIm1PmJiCXHIaxB1PDTTYHR5mRVpiuN2Bje0UckkRWBOBKAlf-aouvnZN1ddYGbs587gMH6pkHU1DxvVDfVhwA5Q6KCuZgp5yY0AuQZfl5-sT-WPWoBexrdNuCzruay0nEh7GCN__WghEmXJjIxE_AJXf2x9Jk7hMDetyIwwtaO_6ujXEy01i4ue2gNMSgCZaWi3yOXAd32_6pR4J6JpcO0NAngtkAwIIhE6FXEe8-sgqgAHpQSSyPb5cnDRd3-v4zRbtV0161AoslCeJoBNPcSMsMmQGXwqhIcECOeZk0_eTMW1dNIiG9PdyMJtHn8fBiA7DYPu5PwoGQ3a7G7Ic41IS1feD_iAYBkG_DIn5Iwk7cR3fc3zH2erAKzYuGlQ2L_XuUM5wTaTJlbbjIlsQAVmnUy4c8RWOdF7loI9NhUrPqZb6snPeqblSX2yoQne1ik2vusNB-GJaC75c8iUM5J1CI2calqqxEDLE2Zs6Xj-cjCeja-K3Ug8Iavfxw26J62TDoBxxRr3A8H8hLfMNFy3E91LEPJ1blZu_J0TE53JCKcQWkm6FqeInlXDJM_w6WjP2S6EsqePl3ovVBVT4ApkMjClgzjOICBhysKy3Tr_ZnxFHTE-4zEzI35HzYzL5pxXde5OK7v6v6EcU_eYNKPp5640ruuecNFt-87uKTjZt32u9VPS9f0g3Cv-qont_VNEv9hX95ucUnab1-4p-8x9Q9EQY3JlFUdnhboM29AmZIkpV8lpup92kNmvsPuCvoCQghJ5DUlDZdM7OOhfl2h7YPN9iCoO_iWIYlSOnls7L9ZLLoqyU9Ykp8C0X1XAOxID2zdvsm8TCwnv0hWS2Fb3nfwEIFGsz.5KoyPhy16K9qfyufe-nXXMrQNY1ekPNPn2yUAUgWV5Q",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "20:30BCNMADUX7708ECONOMY",
                    "baggageAllowance": "0 PC"
                },
                {
                    "segmentRef": "15:10MADBCNUX7703ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 359.85,
                    "currency": "EUR"
                }
            },
            "outboundRef": "15:15BCNMADIB414ECONOMY",
            "hasFareFamilyUpSell": true,
            "inboundRef": "07:15MADBCNIB403ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztV9tu4zYQ_ZWAz85CsnxJ9CbLTteAb7WUAkURLGhp7LCRSS1JZWsE-ffOSPI1drNFtw8p-hSTnMuZmTMn9gszFnLms5_vp_GgzxqMP3OR8YXIhN0MU-bfdloN9rsqtISNYf5vLyyFnGtbaOhzC-jadJrta9e9bnbQffeID71wcngTb3K6jefBJJpN5_GXXhANKKPW4pln-DQO-vvzefPXxmUAnnMCoIr3NwBUiP8awEODqcIuVCGxOy8s1-pZpKBDJZdiVWhuhZLUuLbT8RpMgp1pkQCZ8jU6WeY7n5wGSwqtQSYbzDC4n2NdZBqq9VoYgxH4IoPvddxCmMMS6IlQu7dYSMLxkGUlpJnKRCKgHuFh45xr54aqrpPs03mt9qdW521GakGipNU8sWOV8i1VEJwGg0ik7QuTUJA7ToNY8sxAgy3xMC-yEsPDAWxsp5ArisBcBKIkfOObuvjaNVPfEmXs7syTMnyo0m00DWuun-rDghug1EFZyQz0jBsDcgW6LD_fnsgfswb9mO2dDlvgYgvO9JxYeBok_HwpRtM9GwNxZtzYWCRPQA3oHw_FJTZTy3rcCFOinEzGLbzcZSaG7ku4LhFoIqbVIo-A6-Rx1zH1TEi39DoYAzJdIB8QQCB0JuQ24rDHKoABKUIs1keMub1ym77X9d02bVhNe-bftHE2aSroxDPcCYscmcPXQmhIsUCOOdns83RCexcP4xH9vRvOo_jLJBjTYRTsPw_GwXDEHg5DloNcSSL7cdB3gmEQ9FsjNd8TsSu3jVX5jrNXgjM2Hb_lVDZvFe9U0HBRpMmVtpNivSAKspZLcyTCwoXGqxz0paFQ5TmVUl96zS1VdmSomUJ3tYzN7nujYfhmWAu-WvEVDOVS0frNwlI2FkKGOHpTxxuE08l0_CvxW6knBHX4GBxWuE02CsoJr6kVGP4nZGW-o6KF5FGKhGeRVbn5ZUo8fC0HlEFiIe1VmCp6Ugl3fI3_j7aE_VooS_J4d_RidQEVvkCmQ2MKiPgaYgKGFCzrrdPv1mfMEdMLLjMT8p_o-SWd_NGS3v6Qkt78X9IvSnr0ASS9-9El3XOunO47kk42N753RtKPvpPuJP6MpDvevynp0fdJeveHSHr0H5D0VBhcmUVR2eFugzb0CYkiSlny2s1up_yarLH7gL-D0oAQeg5JQWXTbbW6t-XWnti8PmAKg7-KEhiXI6eWRuV2yVVRVsoGRBT4IxfVcE60gNbN262bxMLCR_SFdL5Xvdc_ARHkahM.vW_YfH7VTnsoIB5HZipfPeptJYkPnC722icnIkJfTF8",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "15:15BCNMADIB414ECONOMY",
                    "baggageAllowance": "1 PC"
                },
                {
                    "segmentRef": "07:15MADBCNIB403ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "15:55YJBXOCI66160ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty4jgQ_ZUpPZMtm1uC34whG28F8ICzNTNbqSlhN0QbI3kkObNUKv--3b6AScik5gkk9e10nz5-ZsZCzjz2-W4RTyesw_gTFxlfi0zYfZgybzTsd9i_qtAS9oZ5_zyzFHKubaFhwi2ga9fpDi5c96I7RPfDIz6Mg3n7Jt7ndBsv_fkqWizj72N_NaWMWosnnuHTzJ8cz-fNXzrvF9BzXhVQxfuNAqqKf13AfYepwq5VIbE7zyzX6kmkoAMlN2JbaG6FktS4gTPsdZgEG2mRAJnyHTpZ5vX7fzgdlhRag0z2mGJ6t0RgZBuo3U4YgyH4OoM3ns55x6aGJWyAnqhst4tIEo6HLCtrilQmEgH1DNudcy6cK4JdJ_moUOpAoqTVPLEzlfKGKWiqwWAd0k6ESSjENac5bHhmoMM2eFgWWVnBfato7KaQW4rAXCxDSfjJ9zV0qwv0zNTPRBl7iMSTMnqg0iaYhh3Xj_VhzQ1QZr-EEYGOuDEgt6BL7HlzIn9M6k9idnRq4-92z-LvvI0R3PxeCKwy48bGInkEQj85nYdLTKZ-jbkRiIotonAeRjfUn0Nq4ucRwkUFQxMvrRb5CrhOHpoOqicqteFWawrIc4FkwBJ8oTMhm4ghLTOV6JMexGJ3QpfRJ7fr9S49d0D7VZOeee5wgMNJU0FHnuFKWOTIEn4UQkOKGDkmZdHNYk5rF4fxLf1eh8tV_H3uz-hw6x__T2d-eMvu2yHLSW4lUf006AfBMAj67ZCaH2nYJ3fgDQae4xyF4IzNldd3Kpu23nz9a3wiJ18WAZ5xUaTJlbbzYrcmDrKhOyRXoiy803qVg35vLAQ9Jyz1Zbxc1XSpL1psodtayKK78W0YvB3Ymm-3fAuh3ChawSgohWMtZIDzN3XIabCYL2ZfieVKPWJd7cdFG-VRNsN5BVILDP8nMjM_bLCF5EGKhGcrq3Lz96IcyiEEsr6B8uXbt18MInaRg1evBnHealRZNaoTt3NNwCS4MlVPypQv9y8lZTJILKTjqkPVxlBHr_kOP5DNDv0olCW5vj55qRaPuuXLNDSmgBXfQZkXl6JMVTfjsNEzjh16RoFhqTC4xOuiskO9AW3oH3ZJkFB2e4Pu5dAd0cYjHQC_4qlPFfYckqfK5rLfvxyVUvLKBtEhOPymJzArOUgDXpULL7dFiZRNaXjwXy4qrrwSKFKA3kEBJAILHtAX0uVRiF_-B5PMsUo.JEFrDTi8kTrwGq3YGDmZIAj2SKTLfMKytEp0pGcRyws",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "15:55YJBXOCI66160ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 90.35,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "15:10MADBCNUX7703ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "LITE",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty2jAQ_ZWOnknHxgESvxlDWma4FZxOm04mI-yFqLElV5KTMpn8e3d9AUKSZvIEkvZyzu7Z9SMzFnLms2-Xs2g4YC3G77lI-Uqkwm5HCfPPu6ct9lsVWsLWMP_XI0sg59oWGgbcArq2nXbnxHVP2l103z3iQz-cHt5E25xuo0UwXc5ni-imHyyHlFFrcc9TfJoEg_35dfOn1tsAPOcIQBXvAwAqxP8HcN1iQq5UIbE4jyzX6l4koEMl12JTaG6FklS3jtP1WkyCnWsRA5nyDJ0s88-6n3tY07jQGmS8xRTDywUSI-NQZZkwBmPwVQovXJ3PzmuODYgFrIGeCLbrIZOY4yFNS1BzlYpYQN3Dw8o5J84Z0a6TvIuUShAraTWP7UQlvJEKYtNgEIi0A2FiinHBqRFrnhposTUeFkVaQrg-QK0KK-SGIrA24lASHvi25m51gZ6peoiVsbtIPC6jhyppgmnIuL6rDytugDIHJY856Dk3BuQGdEk-b07kj0mDQcT2TocFaHuvFZw0eBwj_PqxEIgy5cZGIr4DYj943hCXpEz16nMjkBW7GvycdcZ4uUtM8twTOCkBaJKl1SJfAtfxbVM-dU84G2UdtABVLlAKmD8QOhWyCXj5g1X4AtoGkcieieX8k9v2vZ7vdmi6as2jWjrYmCQRdOIpDoRFfSzgTyE0JMiPY042_zqb0sxFo2hMvxejxTK6mQYTOoyD_f_hJBiN2fVhyLKLG0k6fx70nWAYBP0ylOX_F5jnfHI7vuv4jrPfAq_YdH2vU9m8XDbHuwSHRJpcaTstshXpj_V6Do0myRXeqLzKQb_VFaKeE5f6snd2Xkulvtgphe7qHTa_7I9H4YturfhmwzcwkmuFRs48LFfGSsgQe2_qeMNwNp1NfpK8lbpDUIePV4cUm2TjoGxxRrXA8F9QlfludC3Et1LEPF1alZvvMxLiU9mhFGILSb_CVOmTKFzwDD9GjWL_FMrSarx49lLJnPAFMhkZU8CSZxARMNRgybdOvxufCUdMjzjLLBEGR2ZVVHY42qAN_UOliHIneZ12r-tSmTVWH_CLmQSE0HNoE1Q2vdPT3nk5tUc2T9eYwuD3M4ZJ2XIq6bIcL7kpSqZsSEqBv7momnO0C2jevN28SSQW3qIvJIv9znv6B8B2g2M.z8b5AonfJYB_i_s_GolascKcUko1uNbHQ79nAJhiTD8",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "15:10MADBCNUX7703ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 276.54,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:20MADBCNIBFAKE-BCNMAD-111140ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVVlv2zAM_iuDntPCds7mzbm2YLmWuAOKoSgUmU212pIryW2DIv99pO20adMDe0ooXh_Jj_QTsw4y1mW_zufRcMBqjN9zmfC1TKTbjmPWPWs1auyvzo2CrWXdP08showblxsYcAfoGnhB88T3T4IWuj8rUdHrzw5fom1Gr9EynK0W82V01QtXQ8pojLznCaqm4eBFft98V_sYQN17A6CM9x8ASsSfA7isManWOlfYnCeWGX0vYzB9ra7lJjfcSa2ob0HQCWpMgVsYKYBMeYpODjWt5mmjU2MiNwaU2GKO4fkSKyPrvk5TaS0G4esEjny9U-89R8cfwR4net94D3kJ10AqKnIU_hye-EGz0_CDVpsGKThqkqSoZ6ETKSRU4z9sunfidahjVcavi6T2Ca2c4cJNdcz3NEOkBizCUm4graAgI05DvOaJhRq7RmGZJwUGDKEVPPBtVbEzOVok-kFo6549uCii9HW8dzKQcnNbCWtugTKEBeAFmAW3FtQGTKlPuHWRFLfgpNoMXtfs-1izIQo4I7MVcCNu9jD0PZFhP8QDyMgoib3DaKE0iVRAyDDouMfKbCFtXiTTV909--YH3Xq769eJyRW_WLeD_eJxLEniCZLPYT-XcJdLAzGi5ZiTLX7MZ8TvaBxN6Hc0Xq6iq1k4JWESvvwfTsPxhF0ehiy6sVHEktdBvwiGQdAvxTF-fizqHhUWeF3Pe9m4d2zq3UZlc7zYb_cWSaVspo2b5ema5ljSGpVojwF9v0GBiATwwRx0BuajGVEjMqqsemQlKysJU1UP1d1YnPcm4_7R1ATeVtXHedvKcdifz-bTCzRca32LqQ-VF4dl7QNPwmKsKdXPN_AdmZg9096BuFFS8GTldGZ_z4l8u2IqCQgHcY9vNuhUcpLgjniKx37P0rtcO7o8o1eaKjYBDFU8tjaHFU8hImRIvKK4yibbr9GUI6inHR6cWFrck3Ve2uHNBGPpH9JDxjTvejNot_wzWipsMuAnKQ4JYt2jc1_atBuN9pnvHdvsLjGFxQ-UgGkxWerpqtgptcmLUtmQ6AGPmSwn8WadacnqxZI10UxhYf0b9IV4-XIwdv8AfsVN9g.InP2kd_osBsKbuZPulu_qHb6PHlE_vkakOElx866Ol8",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:20MADBCNIBFAKE-BCNMAD-111140ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 66.04,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:31MADBCNIBFAKE-BCNMAD-111123ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtO4zAQ_ZWVnwtK0tJC3tLbbrW9bRtWQiuEXGcoXhI72A5Qof77ziQpFMpF-9TansuZOWcmT8w6yFnIfp3P4kGfNRi_5zLlK5lKtxklLDxrtxrsry6Mgo1l4Z8nlkDOjSsM9LkDdA284OTI94-CNro_P-JDtzfdv4k3Od3Gi2i6nM8W8VU3Wg4oozHynqf4NIn6L-f3zbeNjwE0vTcAqnj_AaBC_DmAywaTaqULhc15YrnR9zIB09PqWq4Lw53UivoWBKdBgylwcyMFkCnP0MmxsN08xpaKwhhQYoMZBucLrItsezrLpLUYgq9SOPD0jr33HB1_BHtgHLxvvAO8gGugJypxGP0cHPnByWnLD9odolFwfEnTspq5TqWQUJO_33LvyDulftUZvyqRWie0coYLN9EJ30kMcRqwCEq5vrSCQgw5EXjNUwsNdo2HRZGWCDCEVvDAN3W9zhRokeoHoa179uCijNLTyc7JQMbNbX1YcQuUISrhzsHMubWg1mCq95RbF0txC06qdf91xb6PFRui3xmZL4EbcbODoe9JCDsK9yCjmiR2DqNF0qRSASHDoKMuq7JFNHWxzF719uybH4TNTug3ScW1tljo-9gwniSSjjxF5Tls6ALuCmkgQbgck7L5j9mUxB2P4jH9DkeLZXw1jSZ0GEcv_weTaDRml_shy3asFYnkddAvgmEQ9MuQx883RdMrK_NDz3sZt3dsWmFQ2xxO9duhRVUpm2vjpkW2IiIrVeMj2mNA3w-ojaQC-IAInYP5iCRqRE6V1ZeskmV9wlT1Rb005ufd8ah3SJvAzap6yLitPQe92XQ2uUDLlda3mHv_8WK_rl3kcVTymlED-Bq-oxbzZ-E7EDdKCp4unc7t7xnJb1vSkoJwkHT5eo1OlSoJ75BnuOp3Or0rtKPNM3z1UscmgJFKRtYWsOQZxIQMlVdWV9vku0GacAT1tMWFk0iLk7IqKjvcmGAs_UN9yIQIb54EnbZ_RmOFXQb8ICURQWx6tOwrm06r1TnzvUOb7SWmsPh5EjApqaWeLsupUuuiLJUNSB_wmMuKijcDTWPWLMfsBM0UFta7QV9IFi8rY_sPdDtNdQ.-xZ5daxRno9N_2Xnp-QNP8cjDjX4J33VL3yaR9Ke6lA",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:31MADBCNIBFAKE-BCNMAD-111123ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 246.0,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:24MADBCNIBFAKE-BCNMAD-111122ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4jAQ_ZWVn2mVBAotb-G2i5bbQrpStaoq40ypt4md2k5bVPHvO5OEAqUX7RPYc2bmzMwZ54VZBxlrs1-X06jfYzXGH7lM-FIm0q2HMWtfNBs19lfnRsHasvafFxZDxo3LDfS4A3QNvODsxPdPgia6vxrR0OlO9m-idUa30TycLGbTeXTTCRd9ymiMfOQJmsZhb3d-H76pfUyg7r0hUMb7DwIl488JXNeYVEudK2zOC8uMfpQxmK5Wt3KVG-6kVtS3IDgPakyBmxkpgKA8RSeHlnrz1G_WmMiNASXWmKN_OcfKCN3VaSqtxSB8mcCRr3fqvefo-DPY40Tvg7eU53ALZKIiB-HP_okfnJ03_KDZokEKjpYkKeqZ6UQKCdX495vunXjn1LEq49dFUvuEVs5w4cY65luZIVMDFmkp15NWUJABpyHe8sRCjd3iYZ4nBQcMoRU88XVVsTM5IhL9JLR1rx5cFFG6Ot46GUi5ua8OS26BMoQF4RmYGbcW1ApMaU-4dZEU9-CkWvUOa_Z9rNmQBJyR2QK4EXdbGvqRxLAd4h5lVJTE3mG0UJpEKiBmGHTYYWW2kDYvkulBdy---UG73mr7dVJypS_W9j1sGI9jSUeeoPocNnQOD7k0ECNdjknZ7Md0QgKPhtGIfgfD-SK6mYRjOozC3f_-OByO2PV-yKIdK0UyOQz6RTAMgn4pzvHz16LuUWVBo-15u5V7B4OACnO82W8XF1WlbKaNm-TpkgZZ6hqNiMeAvh8ECCMVwAeD0BmYj4ZEjciosuqSlbKsTpiquqgejtllZzTsHo9N4OuqujhxW3n2u9PJdHyFyKXW95h733i1X9c28igs5ppSA_gKvqMWs1fhOxB3SgqeLJzO7O8pyW9TjCUB4SDu8NUKnUpVEt8BT_G53-r0IdeO3p7BgaWKTQRDFQ-tzWHBU4iIGSqvqK7CZNtFGnMk9bLBJyeWFjdlmZc4fDXBWPqH-pAxDbx-FrSa_gWtFXYZ8KMUh0Sx7tGDX2JajUbrwveOMZtrTGHxEyVgXIyWerootkqt8qJU1id9wHMmy1G8WWhas3qxZmcIU1hY9w59IZ7vnozNPwebTj8.dWN3Bw_AeD-rOIMZaAfW0cFFlSqyqV3igP2nPmnQa34",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:24MADBCNIBFAKE-BCNMAD-111122ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "14:05XOCYJBI66141ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz04h-brxmyw7Gy1iW5WVRdtFUNDS2GEjkypJpTWC_PvO6GLLiZOiTzbJuZwzc2b0xIyFnI3Zp9tlPJuyDuOPXGR8LTJh90HKxpfDfod9V4WWsDds_N8TSyHn2hYaptwCunad7uDCdS-6Q3Q_POLDxF-0b-J9Trdx5C1W4TKKv0281Ywyai0eeYZPc296PJ83f-68DaDnvABQxfsDABXi9wHcdZiQa1VILM4Ty7V6FCloX8mN2BaaW6Ek1W3gDHsdJsGGWiRApnyHTpaN-_2PToclhdYgkz1mmN1GyItsfbXbCWMwBF9n8MrTOe_YYIhgA_REqEfII-H4P8tKSKHKRCKg7mC7bs6F8xeRrnP8DifxT5S0mid2rlLe6ARNNRiEIe1UmIRCXHHqwoZnBjpsg4eoyEoEdy3MqrBCbikC6yIMJeEn39fMrS7QM1M_E2XsIRJPyui-SptgGnZcP9SHNTdAmb2SRgg65MaA3IIuuefNifwxqTeN2dGpzb_bPcu_8zqGf_1nIRBlxo2NRfIAxH562g-XdEz1mnAjkBVbhsEiCK9dvD6kJnUeKVxUNDTJ0mqRr4Dr5L6poHokqI20Wl1AlQsUA0LwhM6EbCIGNMoE0aNtEIvdiVwuP7jdcW80dgc0XbXm2dgdDrA5aSroyDOcCIsaieBHITSkyJFjUhZeLxc0dHEQ39DvVRCt4m8Lb06HG-_4fzb3ght21w5ZdnIrSemnQX8TDIOg3w6l-f4G6zkf3P7YGYwd57gGztgMcborm_a2-bz0T5bJl38meMZBkSZX2i6K3Zo0yIZunzpJkoU3Sq9y0G-1hajnxKW-jKNVLZf6oqUWuq3XWHg7uQn81w1b8-2WbyGQG4VWbuiXi2MtpI_9N3XImb9cLOdfSOVKPSCu9uOyzfK4NINFRVILDP83KjM_TLCF5F6KhGcrq3Lz77JsyiEEqr6h8vnr13caEbsDnLAXjThv1ausmq0Tt3NNwSQ4MlVNypTPd8-lZDJILKSTqkLVxFBFr_gOP4_NDP0olKVtfXXyUg0eVcuTaWBMASu-gzIvDkWZqi7GYaLnHCv0hAuGpcLgEK-Lyg73DWhD_7BKolyUvUF3NHQvaeJRDoDf8NQjhD2H1lNlM-r3R5flKnlhg-yQHH7RE5iXGqQGr8qBl9uiZMpm1Dz4lYtKKy8WFG2A3mEDSCTm36MvpNFxET__D4lcsHQ.0iviXSo-Ith-k7kz422qebPzxGGbNOe6fzThI9uVfLc",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "14:05XOCYJBI66141ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "08:25XOCYJBI66081ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVVtz2joQ_isdPZMzNrcEvxlDTtwJ4IJzpu2ZTEfYC1FjJFeS0zKZ_Pfu-gImt06fQNLevt1vPz8yYyFnHvt0s4inE9Zh_IGLjK9FJuw-TJk3GvY77LsqtIS9Yd7_jyyFnGtbaJhwC-jadbqDM9c96w7R_fCID-Ng3r6J9zndxkt_vooWy_jb2F9NKaPW4oFn-DTzJ8fz6-ZPnbcL6DnPCqji_UUBVcXvF3DbYUKuVSGxOY8s1-pBpKADJTdiW2huhZLUt4Ez7HWYBBtpkQCZ8h06Web1-_84HZYUWoNM9phherNEXGQbqN1OGIMh-DqDF57O645NDUvYAD2VPUEcCcf_WVaWFKlMJALqCbb75pw5FwS6zvGnOgl_oqTVPLEzlfKGJ2iqwWAZ0k6ESSjEJacpbHhmoMM2eFgWWVnBbatmVVghtxShrFlJ-Mn3NXKrC_TM1M9EGXuIxJMyeqDSJpiGHdf39WHNDVBmv4QRgY64MSC3oEvseXMif0zqT2J2dGrj73Zfxd95GSO4-rsQWGXGjY1Fcg-EfnI6D5d4TP0acyMQFVtE4TyMrly8PqQmdh4hnFUwNNHSapGvgOvkrumgeqBSG2q1poAsF0gGLMEXOhOyiRjSKlOJPqlBLHYndBl9cLte79xzB7RdNeeZ5w4HOJw0FXTkGW6ERY4s4UchNKSIkWNSFl0t5rR0cRhf0-9luFzF3-b-jA7X_vH_dOaH1-y2HbKc5FYS00-D_iEYBkG_HVLzfQXrOR-cC6878BznKAMvbVzXc53Kpq02nxfBiZh8-TjGMy6KNLnSdl7s1sRBNnQuaJJEWXij9SoH_dZYCHpOWOrLeLmq6VJftNhCt7WMRTfj6zB4ObA13275FkK5UWjlRkEpHGshA5y_qUNOg8V8MftCLFfqHutqPy7aKI-iGc4rkFpg-H-Rmflhgy0kd1IkPFtZlZv_FuVQDiGQ9Q2Uz1-_vjOI2Bl5_eeDeN3Krawa1YnbuSZgElyZqidlyqfbp5IyGSQW0nHVoWpjqKOXfIefx2aHfhTKklpfnrxUi0fd8mUaGlPAiu-gzItLUaaqm3HY6BnHDj2iwLBUGFzidVHZod6ANvQPuyRKoewNuudDd0Qbj3QA_IanPlXYc0ieKpvzfv98VErJMxtEh-Dwi57ArOQgDXhVLrzcFiVSNqXhwa9cVFx5JlCkAL2DAkgEFtyhL6TLoxA__QZu27B0.LGcYoCSsiMIesy2cCyaRiG9okiXrjBwBhFhi_HLwnBI",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "08:25XOCYJBI66081ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "09:16XOCYJBI66091ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty4jgQ_ZUpPZMtGwNZeDOGbLwVsBecrZnZSk0JuyHaGMkjyZmlUvn37fYFTG5T8wSS-nJO9-n2EzMWCjZhf91GyXzGeow_cpHzjciFPYQZm4xHgx77V5VawsGwyT9PLIOCa1tqmHEL6Np3-sML173oj9D9-IgP02DZvUkOBd0mK3-5jqNV8m3qr-eUUWvxyHN8Wviz0_lt8-fe-wA85wWAOt4vAKgRfwzgrseE3KhSYnGeWKHVo8hAB0puxa7U3AolqW5DZ-T1mAQba5ECmfI9Olk2GQx-c3osLbUGmR4ww_x2hbzINlD7vTAGQ_BNDq88nbcdWwwr2AI9EWoPeaQc_-d5BSlWuUgFNB3s1s25cH4n0k2On-Ek_qmSVvPULlTGW52gqQaDMKSdCZNSiCtOXdjy3ECPbfGwKvMKwV0HsyqtkDuKwPoIQ0n4wQ8Nc6tL9MzVj1QZe4zE0yp6oLI2mIY91w_NYcMNUGa_ohGDjrkxIHegK-5FeyJ_TOrPEnZy6vLv99_k33sdI7j-tRCIMufGJiJ9AGI_O--HSzqmek25EciKRXG4DONrF6-PqUmdJwoXNQ1NsrRaFGvgOr1vK6geCWorrU4XUOUCxYAQfKFzIduIIY0yQfRpGyRifyaX8Se3P_EuJ-6QpqvRPJu4oyE2J8sEHXmOE2FRIyv4XgoNGXLkmJTF19GShi4Jkxv6vQpX6-Tb0l_Q4cY__Z8v_PCG3XVDVp3cSVL6edCfBMMg6LdHaX68wTznkzNGHhPHOa2B1zbI3nFrm-62-RwFZ8vky59TPOOgSFMobZflfkMaZCNnTJ0kycI7pVcF6PfaQtQL4tJcJqt1I5fmoqMWum3WWHw7vQmD1w3b8N2O7yCUW4VWbhxUi2MjZID9N03IeRAto8UXUrlSD4ir-xh1WZ6WZrisSWqB4f9AZRbHCbaQ3kuR8nxtVWH-jqqmHEOg6lsqn79-_aARietMvJeNeNuqX1u1Wyfp5pqBSXFk6ppUKZ_vnivJ5JBayKZ1heqJoYpe8T1-HtsZ-l4qS9v66uylHjyqli-z0JgS1nwPVV4ciipVU4zjRC84VugJFwzLhMEh3pS1He4b0Ib-YZVEtSi9Yf9y5I5p4lEOgN_wzCeEnkPrqba5HAwux9UqeWGD7JAcftFTWFQapAavq4GXu7JiyubUPPivELVWXiwo2gDecQNIJBbcoy9kq9Mifv4fZh6waA.Ap-7pgLGix4MrX-sbRpnveexo2nf-h2G399FC4IQD5Y",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "09:16XOCYJBI66091ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 206.38,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:27MADBCNIBFAKE-BCNMAD-111141ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2kAQ_ZVqn0nlC4TAm7m1qNwKTqWqiqplPSHb2Lvu7joJQvx7Z2yTkJCL-gS7O5czc86Md8w6yFmXfb-cx8MBazB-x2XK1zKVbjtOWLdz3mywP7owCraWdX_tWAI5N64wMOAO0DXwgtaZ758F5-j--IgPvf7s-Cbe5nQbL6PZajFfxr970WpIGY2RdzzFp2k0eDq_br5vvA0g9F4AqOL9B4AK8fsArhpMqrUuFDZnx3Kj72QCpq_VtdwUhjupFfUtCC6CBlPgFkYKIFOeoZNjXb9z8dkPG0wUxoASW8wxvFxiZWTd11kmrcUgfJ3Cia_32XvN0fEHsCfGwevGB8hLuAZ6oiJH0bfhmR-0Lpp-cN4mIgXHlzQt61noVAoJNf3HTffOvAvqWJ3x4yKpfUIrZ7hwU53wg8wQqQGLsJQbSCsoyIgTidc8tdBg13hYFmmJAUNoBfd8W1fsTIEWqb4X2rpHDy7KKH2dHJwMZNzc1oc1t0AZohLwAsyCWwtqA6Z6T7l1sRS34KTaDJ7X7PtYsyEJOCPzFXAjbg4w9B2J4UDiEWRUlMTeYbRImlQqIGQYdNxjVbaIJi-W2bPudj75QTdsd_2QlFzrC6cS-8WTRNKJpyg-h_1cwt9CGkgQLcecbPF1PiN9x-N4Qr-j8XIV_55FUzpMoqf_w2k0nrCr45BlNzaKVPI86AfBMAj6ZUjj-8si9KiwoN31vKeJe8Um7LZqm9PBfjm3KCplc23crMjWxGMla3xEewzo-00ijkQAb_CgczBvcUSNyKmy-pJVqqxPmKq-qPfG4rI3GfdPWBO4W1Uf-ba147A_n82nP9FwrfUtpj5-_Hlc1iHwJCppzah-voEvqMT8UfYOxI2Sgqcrp3P7Y07i25espCAcJD2-2aBTpUmCO-IZLvuDSv8W2tHmGT17qWMTwEglY2sLWPEMYkKGwiuLq23ywxhNOYLa7XHhJNLinKyLyg53JhhL_1AeMiG-w1bQPvc7NFTYZMBPUhIRxNCjdV_ZtJvNdsf3Tm32V5jC4gdKwLRklnq6KmdKbYqyVDYkecBDLismXowzDVlYDlkLzRQW1r9BX0iWTwtj_w-Np04C.HN8oaq1Nl_8jsHAICbv53GH-Vhhj6-DVhH265WkYBag",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:27MADBCNIBFAKE-BCNMAD-111141ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 239.62,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:34MADBCNIBFAKE-BCNMAD-111142ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtO20AQ_ZVqn0PlSyCQN-fWRs2tiamEKoQ26yFssXfd3TUQofx7Z2wHEhJAfUpm53Zm5sz4mVkHOWuzn5fTuN9jDcYfuEz5UqbSrYcJa1-cNRvsjy6MgrVl7d_PLIGcG1cY6HEH6Bp4wemJ758EZ-j-okRFpzvZfYnXOb3G82iymE3n8U0nWvQpozHygaeoGke9V_m4-abxPoDQewOgivcfACrEHwO4bjCplrpQ2Jxnlhv9IBMwXa1u5aow3EmtqG9BcB40mAI3M1IAmfIMnRxqQu-rFzaYKIwBJdaYo385x8rIuquzTFqLQfgyhQNf9Dzm6PgT2MNEx423kOdwC6SiIgfRj_6JH5yeN_3grEWDFBw1aVrWM9OpFBLq8e823TvxzqljdcbPi6T2Ca2c4cKNdcK3NEOkBizCUq4nraAgA05DvOWphQa7RWFepCUGDKEVPPJ1XbEzBVqk-lFo6148uCijdHWydTKQcXNfC0tugTJEJeAZmBm3FtQKTKVPuXWxFPfgpFr19mv2fazZEAWckfkCuBF3Wxj6gciwHeIOZGSUxN5htEiaVCogZBh02GFVtog2L5bZXncvvvhBO2y1_ZCYXPOLtX0PG8aTRJLIU2Sfw4bO4W8hDSQIl2NSNvs-nRDB42E8ot_BcL6IbybRmIRR9Pq_P46GI3a9G7Jsx0oRTfaDfhIMg6BfhnP8-FqEXllZs-15ryt3xKbZ9mubw81-u7jIKmVzbdykyJY0yIrXqER7DOj7zQDNiAXwziB0Dua9IVEjcqqsfmQVLWsJU9UP9eGYXXZGw-7h2AReV9XFidvas9-dTqbjK7Rcan2PuXeVV7t1bSOPonKuGTWAr-AbcjF_Ib4Dcaek4OnC6dz-mhL9NuVYUhAOkg5frdCpYiXhHfAMz_2Wp38L7ej2DPY0dWwCGKlkaG0BC55BTMiQeWV1tU2-XaQxR1DPGzw5ibS4KcuissOrCcbSP-SHTGjg4WnQOvMvaK2wy4AfpSQiiKFHB7-yaTWbrQvfO7TZXGMKi58oAeNytNTTRblValWUpbI-8QOeclmN4s1C05qF5ZqdopnCwrp36AvJ_PVkbP4BqAhOLw.rMUxHtK3n779mzboc0Yc4HdgoQsnhhmwXq12Xq2coMI",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:34MADBCNIBFAKE-BCNMAD-111142ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "18:35XOCYJBI66181ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz85Cki9J9CbLzkZFbKuysmhRBAUtjR02MqmSVFojyL_vjCTbci4t-mSTnMs5M2dGT8xYKJnPPt0u0umE9Rh_5KLgK1EIu4ty5l-OBj32XVVaws4w_-sTy6Hk2lYaJtwCunqONzxz3TNvhO6HR3wYh_PuTbor6TZNgvkyXiTpt3GwnFJGrcUjL_BpFkyO57fNn3vvA-g7LwA08f4CQIP49wDuekzIlaokFueJlVo9ihx0qORabCrNrVCS6jZ0Rv0ek2BjLTIgU75FJ8v8weAfp8eySmuQ2Q4zTG8T5EW2odpuhTEYgq8KeOXpvO24x5DAGuiJULvII-P4vyhqSLEqRCag7WC3bs6Zc0Gk2xx_wkn8MyWt5pmdqZzvdYKmGgzCkHYiTEYhrjh1Yc0LAz22xkNSFTWCuw5mVVkhNxSBeQhDSfjJdy1zqyv0LNTPTBl7iMSzOnqo8n0wDVuuH9rDihugzEFNIwYdc2NAbkDX3Mv9ifwxaTBJ2dGpy9_z3uTfex0jvP67EIiy4MamInsAYj857YdLOqZ6jbkRyIot4mgexdfU00NqUueRwllDQ5MsrRblErjO7vcVVI8EdS-tThdQ5QLFgBACoQsh9xEjGmWCGNA2SMX2RC6XH1zP75_77pCmq9U8wyNy5Xku6MgLnAiLGkngRyU05MiRY1IWXy_mNHRplN7Q71WULNNv82BGh5vg-H86C6IbdtcNWXdyI0npp0H_EAyDoN8Wpfn7DdZ3PrgXfn_oO85xDby28VzfaW262-bzIjxZJl8-jvGMgyJNqbSdV9sVaZCN3AvqJEkW3im9KkG_1xaiXhKX9jJNlq1c2ouOWui2XWPx7fgmCl83bMU3G76BSK4VrY04rBfHSsgQ-2_akNNwMV_MvpDKlXpAXN3HRZflcWlG84akFhj-X1RmeZhgC9m9FBkvllaV5r8FifG5blIBmYV83GBqNEocrvgWP0h71f6olKX9eHXy0kid8AUyj4ypYMm3kBIwlGFNuE1_mKEZR0xPONIsFwbHZlU1djjhoA39Q7GIejX1h975yL2kGcMGAH4184AQ9h1aCI3N-WBwflkP7wub5ztMYfAbmsGs7jqVdFmPmNxUNVM2pXLBr1I03XmxEmjm-oeZk0gsvEdfyJPj6nv-Hzq-hEU.GWtyLQnt2pgP7ik5v-OPzw3BTvaFnuDk7rYHGQRoXTo",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "18:35XOCYJBI66181ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 159.14,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:07MADBCNIBFAKE-BCNMAD-111101ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtO4zAQ_ZWVnwtK0pZC39LbbrW9bRtWQiuEXGdavCR2sB2gqvrvO5OkUKCA9qm1PZczc85Mtsw6yFib_bqcRv0eqzH-wGXClzKRbjOMWfvirFFjf3VuFGwsa__ZshgyblxuoMcdoGvgBc0T3z8JztD9-REfOt3J4U20yeg2moeTxWw6j2464aJPGY2RDzzBp3HYezkfN9_VPgZQ994AKOP9B4AS8ecArmtMqqXOFTZnyzKjH2QMpqvVSq5zw53UivoWBOdBjSlwMyMFkClP0cmxtt8MTlvnNSZyY0CJDeboX86xMrLu6jSV1mIQvkzgna936h1zdPwJ7Dvj4LjxHvIcVkBPVOQg_Nk_8YPmecMPzlpEpOD4kiRFPTOdSCGhov-w6d6Jd04dqzJ-XSS1T2jlDBdurGO-lxkiNWARlnI9aQUFGXAiccUTCzW2wsM8TwoMGEIreOSbqmJncrRI9KPQ1j17cFFE6ep472Qg5eauOiy5BcoQFoBnYGbcWlBrMOV7wq2LpLgDJ9W697pm38eaDUnAGZktgBtxu4ehH0gMexIPIKOiJPYOo4XSJFIBIcOgww4rs4U0eZFMX3X34psftOuttl8nJVf6wqnEfvE4lnTiCYrPYT_ncJ9LAzGi5ZiTzX5MJ6TvaBiN6HcwnC-im0k4psMofPnfH4fDEbs-DFl0Y61IJa-DfhEMg6BfijR-vizqHhXmtdqe9zJxR2zqVLx3fLDfzi2KStlMGzfJ0yXxWMoaH9EeA_q-R8SRCOADHnQG5iOOqBEZVVZdslKV1QlTVRfV3phddkbD7jvWBO5W1UW-beXY704n0_EVGi61vsPUh49Xh2XtA4_CgtaU6udr-I5KzJ5l70DcKil4snA6s7-nJL5dwUoCwkHc4es1OpWaJLgDnuKy36v0PteONs_g1UsVmwCGKh5am8OCpxARMhReUVxlk-3HaMwR1HaHCyeWFudkmZd2uDPBWPqH8pAx8V1vBq0z_4KGCpsM-EmKQ4JY92jdlzatRqN14XvvbXbXmMLiB0rAuGCWerooZkqt86JU1id5wFMmSybejDMNWaEzv4lmCgvr3qIvxPOXhbH7B4ScTfw.pwSa9zaVfiEfBbDpwFy6fZz1-mgdd9PkqkOkgxPbZpE",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:07MADBCNIBFAKE-BCNMAD-111101ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 232.69,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:00MADBCNIBFAKE-BCNMAD-111100ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVVlP4zAQ_isrPxeUA2jpW3rtVttr27ASWiHkOkPxktjBdoCq6n_fmSSFQjm0UqTEnuubmW8mG2Yd5KzNfl1M436PNRh_4DLlS5lKtx4mrH1-dtJgf3VhFKwta__ZsARyblxhoMcdoGngBadHvn8UnKH5sxAFne5k_yZe53Qbz6PJYjadx9edaNGniMbIB56iaBz1Xs7vq28bHwMIvTcAKn__AaBC_DmAqwaTaqkLhcXZsNzoB5mA6Wp1I1eF4U5qRXULglbQYArczEgBpMozNHIkCY_DVoOJwhhQYo0x-hdzzIy0uzrLpLXohC9TOLD1jr33DB1_AnsY6H3lHeQ53ACJKMlB9LN_5AenrRM_OGtSIwVHSZqW-cx0KoWEuv37RfeOvBZVrI74dZJUPqGVM1y4sU74jmaI1IBFWMr1pBXkZMCpiTc8tdBgN3iYF2mJAV1oBY98XWfsTIEaqX4U2rpnCy5KL12d7IwMZNzc1Yclt0ARohLwDMyMWwtqBaaSp9y6WIo7cFKteq9z9n3M2RAFnJH5ArgRtzsY-oHIsGviHmRklMTaobdImlQqIGTodNhhVbSIJi-W2avqnn_zg3bYbPshMbnmF2u3sF48SSSdeIrkc1jPOdwX0kCCaDnGZLMf0wnxOx7GI3oPhvNFfD2JxnQYRS_f_XE0HLGrfZdlNVaKWPLa6RfO0AnaZdjGz5dF6FFinofPy8S9oxO2g1rncLDfzi2SStlcGzcpsiX1saI1ClEfHfp-6YhIAB_0QedgPuoRFSKnzOpLVrGyPmGo-qLeG7OLzmjYPeiawN2quthvWxv2u9PJdHyJikut7zD0vvByP62d41FUtjWj_PkKviMT82faOxC3SgqeLpzO7e8pkW9bdiUF4SDp8NUKjSpOEtwBz3DZ71h6X2hHm2fwSlL7JoCRSobWFrDgGcSEDIlXJlfr5LsxGnMEtdniwkmkxTlZFpUe7kwwlr6QHjKhfoenQfPMP6ehwiID_pKSiCCGHq37Sqd5ctI8971Dne0VhrD4gxIwLjtLNV2UM6VWRZkq6xM94CmXVSfejDMNWVgO2SmqKUyse4u2kMxfFsb2HyHcTeA.dNTTSjCFr-CQrgw1vqAjwnNJVI4NLSCUO3AaNVKHJAg",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:00MADBCNIBFAKE-BCNMAD-111100ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 208.94,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:14MADBCNIBFAKE-BCNMAD-111102ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2kAQ_ZVqn0lkGwiBN3NrUbkVnEpRFUXLekK2sXed3XUShPj3ztgmISEX9Qlm53Zm5sx4y6yDjHXYr4tZNOizGuMPXCZ8JRPpNqOYddpnjRr7q3OjYGNZ58-WxZBx43IDfe4AXQMvaJ74_klwhu7PSlR0e9PDl2iT0Wu0CKfL-WwRXXfD5YAyGiMfeIKqSdh_kd8339U-BlD33gAo4_0HgBLx5wCuakyqlc4VNmfLMqMfZAymp9WNXOeGO6kV9S0IzoMaU-DmRgogU56ik0ON55022zUmcmNAiQ3mGFwssDKy7uk0ldZiEL5K4MjXO_Xec3T8CexxoveN95AXcAOkoiKH4c_BiR80zxt-cNaiQQqOmiQp6pnrRAoJ1fgPm-6deOfUsSrj10VS-4RWznDhJjrme5ohUgMWYSnXl1ZQkCGnId7wxEKN3aCwyJMCA4bQCh75pqrYmRwtEv0otHXPHlwUUXo63jsZSLm5q4QVt0AZwgLwHMycWwtqDabUJ9y6SIo7cFKt-69r9n2s2RAFnJHZErgRt3sY-oHIsB_iAWRklMTeYbRQmkQqIGQYdNRlZbaQNi-S6avutr_5Qafe6vh1YnLFL9bxPWwYj2NJIk-QfQ4buoD7XBqIES7HpGz-YzYlgkejaEy_w9FiGV1PwwkJ4_Dl_2ASjsbs6jBk0Y61Ipq8DvpFMAyCfinO8fNrUfeoMr_R8byXlXvHpt5pVjbHm_12cZFVymbauGmermiQJa9RifYY0Pe9AM2IBfDBIHQG5qMhUSMyqqx6ZCUtKwlTVQ_V4ZhfdMej3vHYBF5X1cOJ28pz0JtNZ5NLtFxpfYe5D5WXh3XtI4_DYq4pNYCv4TtyMXsmvgNxq6TgydLpzP6eEf12xVgSEA7iLl-v0alkJeEd8hTP_Z6n97l2dHuGrzRVbAIYqnhkbQ5LnkJEyJB5RXWVTbZfpAlHUNsdnpxYWtyUVV7a4dUEY-kf8kPGNPB6M2id-W1aK-wy4EcpDgli3aODX9q0Go1W2_eObXZXmMLiJ0rApBgt9XRZbJVa50WpbED8gKdMlqN4s9C0ZvVizZpoprCw3i36Qrx4ORm7f_VQTjw.ghsa-UdZNNXC5qniRlRedaKSSR8XPnoU9Z6n-sz0Z6w",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:14MADBCNIBFAKE-BCNMAD-111102ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 124.29,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:41MADBCNIBFAKE-BCNMAD-111143ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtO4zAQ_ZWVnwvKpVDat_S2W21v24aV0Aoh1xmKl8QOtgNUqP--M0kKhXLRPrX2XHzmzJnJE7MOctZhv85n8aDPGozfc5nylUyl24wS1mmfNhvsry6Mgo1lnT9PLIGcG1cY6HMHGBp4wcmR7x8Fpxj-bERDtzfdv4k3Od3Gi2i6nM8W8VU3Wg7oRWPkPU_RNIn6L-f33beNjwGE3hsAVb7_AFAh_hzAZYNJtdKFQnKeWG70vUzA9LS6luvCcCe1It6C4CxoMAVubqQAcuUZBjnW8f32cYg2URgDSmzwjcH5Aisj757OMmktJuGrFA5ivWPvvUDHH8EeOAfvO-8gL-AayERFDqOfgyM_ODlr-sFpixopOFrStKxnrlMpJNTt3yfdO_LOiLH6xa-LJPqEVs5w4SY64TuZIVIDFmEp15dWUJIhpyZe89RCg13jYVGkJQZMoRU88E1dsTMFeqT6QWjrniO4KLP0dLILMpBxc1sfVtwCvRCVgOdg5txaUGswlT3l1sVS3IKTat1_XbPvY82GJOCMzJfAjbjZwdD3JIZdE_cgo6IkcofZImlSqYCQYdJRl1WvRTR5scxesdv-5gedsNXxQ1JyrS-iFwnjSSLpyFNUn0NCF3BXSAMJwuX4KJv_mE1J4PEoHtPvcLRYxlfTaEKHcfTyfzCJRmN2uZ-ypGOtSCavk36RDJNgXIZ9_HxbhB5V1vQ7nvcycu_4NDth7XM42W8HF1WlbK6NmxbZihpZ6RqN6I8Jfb9JNJIK4ING6BzMR00iInKqrL5klSzrEz5VX9SLY37eHY96h20TuF1VDztu68hBbzadTS7Qc6X1Lb69b7zYr2uXeRyVfc2IAL6G76jF_Fn4DsSNkoKnS6dz-3tG8tuWbUlBOEi6fL3GoEqVhHfIM1z3O53eFdrR7hm-stS5CWCkkpG1BSx5BjEhQ-WV1dU--W6QJhxBPW1x5STS4qSsisoPtyYYS_9QHzKhhocnQevUb9NYIcuAH6UkIoihRwu_8mk1m6227x36bC_xCYufKAGTsrXE6bKcKrUuylLZgPQBj7msWvFmoGnMwnLMTtBNYWG9G4yFZPGyMrb_APvCTj8.k2UJdijC4X3qqm-KxM7JLwLtldrZsaOG0I0cUyKzGIs",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:41MADBCNIBFAKE-BCNMAD-111143ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 58.33,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "16:40XOCYJBI66161ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INSUPERIOR",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVW1v2jAQ_iuTP9MpgZYOvoVA10wFsiSdNk3VZJKDek3szHbaoar_fXdJgNCXTfsEtu_lee6euzwyY6FkY_b5epnMpqzH-D0XOV-JXNhtkLHxaHjaYz9VpSVsDRt_f2QZlFzbSsOUW0DXvtM_O3Hdk_4Q3feP-DDxF92bZFvSbRJ5izhcRsmPiRfPKKPW4p7n-DT3pofz6-ZPvbcBDJxnAJp4_wGgQfx3ADc9JuRKVRKL88hKre5FBtpXci02leZWKEl1O3OGgx6TYEMtUiBTXqCTxZfhe6fH0kprkOkWM8yuI-RFtr4qCmEMhuCrHF54Oq877jBEsAZ6ItRuH4mkHA95XmMKVS5SAW0Lu4VzTpwPxLpN8i-gVIBUSat5aucq4zuhoKkGgziknQqTUogLTm1Y89xAj63xEFV5jeCmA1pVVsgNRWCEWUl44NuWutUVeubqIVXG7iPxtI7uq2wXTEPB9V17WHEDlNmraYSgQ24MyA3omnu5O5E_JvWmCTs4dfn3P7zKv_cyhn_5fyEQZc6NTUR6B8R-etwPl4RM9ZpwI5AVi8P4OgwvXbzepyZ5HiicNDQ06dJqUcbAdXq7q6C6J6g7bXW6gDIXKAaE4AmdC7mLGNAsE0SP1kEiiiO5jN65_fHgfOye0Xi1omd4RK48ywQdeY4jYVEjEfyqhIYMOXJMysLL5YKmLgmSK_q9CKI4-bHw5nS48g7_Z3MvuGI33ZB1JzeSpH4c9B_BMAj6FSjNv6-wgfPOHY5PnbHjHPbAKzajsdvadNfN16V_tE2-fZrgGQdFmlJpu6iKFWmQDd0hdZIkC2-UXpWg32oLUS-JS3uZRHErl_aioxa6bfdYeD25CvyXDVvxzYZvIJBrRXsj9OvFsRLSx_6bNuTMXy6W82-kcqXuEFf3Me6yPGzNYNGQ1ALDf0RllvsJtpDeSpHyPLaqNF-WJManukk5pBaySYOp0ShxuOAFfpF2qv1VKUsL8uLopZE64fNkFhhTQcwLSAgYyrAm3Kbfz9CcI6ZHHGmWCYNjs6oaO5xw0Ib-oVhEvZoGZ_3zoTuiGcMGAH42M48QDhxaCI3N-enp-age3mc2TzeYwuBHNIV53XUqaVyPmNxUNVM2o3LB71I03Xm2EmjmBvuZk0jMv0VfyKLD6nv6A_tqhMA.GKUMDeU4Rf89F2S18MCln4YQZGbhUaquoIzqA1Jt-Kg",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "16:40XOCYJBI66161ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "10:00XOCYJBI66011ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz04h-droTZadRovYVm1l0XYRFLQ0driRSZWk0jWC_PvO6GLLiZOiQICY5NzOzJmjJ2Ys5MxjX24X8XTCOow_cpHxtciE3Ycp8y6H_Q77VxVawt4w758nlkLOtS00TLgFdO063cGF6150h-h-eMSHcTBv38T7nG7jpT9fRYtl_GPsr6aUUWvxyDN8mvmT4_m8-XPn7QJ6zosCqnh_UEBV8fsF3HWYkGtVSGzOE8u1ehQp6EDJjdgWmluhJPVt4Ax7HSbBRlokQKZ8h06Wef3-R6fDkkJrkMkeM0xvl4iLbAO12wljMARfZ_DK0znv2NSwhA3QE1XdRxwJx99ZVpYUqUwkAuoJtvvmXDifCHSd43d1Ev5ESat5Ymcq5Q1P0FSDwTKknQiTUIgrTlPY8MxAh23wsCyysoK7Vs2qsEJuKQLrYhlKwi--r5FbXaBnpn4lythDJJ6U0QOVNsE07Lh-qA9rboAy-yWMCHTEjQG5BV1iz5sT-WNSfxKzo1Mbf7d7Fn_ndYzg-s9CYJUZNzYWyQMQ-snpPFziMfVrzI1AVGwRhfMwunbx-pCa2HmEcFHB0ERLq0W-Aq6T-6aD6pFKbajVmgKyXCAZsARf6EzIJmJIq0wl-qQGsdid0OXyg9v1eiPPHdB21Zxnnjsc4HDSVNCRZ7gRFjmyhJ-F0JAiRo5JWXS9mNPSxWF8Q_-vwuUq_jH3Z3S48Y-_pzM_vGF37ZDlJLeSmH4a9DfBMAj67ZCa7ytYz_ngOp5Df0cZOGPT9fqDyqatNl8XwYmYfPtrjGdcFGlype282K2Jg2zouDRJoiy80XqVg35rLAQ9Jyz1Zbxc1XSpL1psodtaxqLb8U0YvB7Ymm-3fAuh3Ci0cqOgFI61kAHO39Qhp8Fivph9I5Yr9YB1tR8XbZRH0QznFUgtMPxnZGZ-2GALyb0UCc9WVuXm70U5lEMIZH0D5ev37-8MInZdzx29GMR5q0-VVaM6cTvXBEyCK1P1pEz5fPdcUiaDxEI6rjpUbQx19Irv8PPY7NDPQllS66uTl2rxqFu-TENjCljxHZR5cSnKVHUzDhs949ihJxQYlgqDS7wuKjvUG9CGfmGXRCmUvUF3NHQvaeORDoDf8NSnCnsOyVNlM-r3R5ellLywQXQIDr_oCcxKDtKAV-XCy21RImVTGh78l4uKKy8EihSgd1AAicCCe_SFdHkU4uf_AUyYsGQ.KmQl_aieD5Vqs5nFRHL8kli-OghFnmusPwDDVGprOMY",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "10:00XOCYJBI66011ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 94.95,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:21MADBCNIBFAKE-BCNMAD-111103ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4jAQ_ZWVn2mVBCgtb-G2i5bbQrpStaoq40ypt4md2k5bVPHvO5OEAqUX7RPYnsuZM2cmL8w6yFib_bqcRv0eqzH-yGXClzKRbj2MWfvirFFjf3VuFKwta_95YTFk3LjcQI87QNfAC5onvn8SnKH76yM-dLqT_ZtondFtNA8ni9l0Ht10wkWfMhojH3mCT-Owtzu_b76pfQyg7r0BUMb7DwAl4s8BXNeYVEudKyTnhWVGP8oYTFerW7nKDXdSK-ItCM6DGlPgZkYKIFOeopNDRv1Tv1ljIjcGlFhjiv7lHAsj465OU2ktxuDLBI5cvVPvPUfHn8EeGQfvG28Rz-EW6IlqHIQ_-yd-0Dxv-MFZi_ooOL4kSVHOTCdSSKi6v8-5d-KdE2FVxi9rJPKEVs5w4cY65luRIVADFlEp15NWUIwBpxbe8sRCjd3iYZ4nBQQMoRU88XVVsDM5WiT6SWjrXj24KKJ0dbx1MpByc18dltwCZQgLvDMwM24tqBWY8j3h1kVS3IOTatU7LNn3sWRDAnBGZgvgRtxtYehHksK2h3uQUU8SqcNooTSJVEDIMOiww8psIc1dJNMDci---UG73mr7ddJxpS7W9n0kjMexpCNPUHsOCZ3DQy4NxAiXY1I2-zGdkLyjYTSi38FwvohuJuGYDqNw978_Docjdr0fsqBjpUglh0G_CIZB0C_FPn6-K-oeVRb4bc_bDdw7Ng2stbQ5nuu3Y4uqUjbTxk3ydEmNLGWNj2iPAZE1opFUAB80QmdgPmoSEZFRZdUlK2VZnTBVdVGtjdllZzTsHrdN4G5VXey4rTz73elkOr5Cy6XW95h7__Fqv65t5FFY9DUlAvgKvqMWs1fhOxB3SgqeLJzO7O8pyW9TtCUB4SDu8NUKnUpVEt4BT3HZb3X6kGtHq2dw8FLFJoChiofW5rDgKUSEDJVXVFfZZNtBGnME9bLBjRNLi5OyzEs73JlgLP1DfciYGl5vBq0z_4LGClkG_CTFIUGse7TuS5tWo9G68L1jm801prD4gRIwLlpLnC6KqVKrvCiV9Ukf8JzJshVvBprGrF6MWRPNFBbWvUNfiOe7lbH5B7jqTdc.wPY205lYnnoCHsPlWd3P7QioHwKyrrNP0CzAvLv2d54",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:21MADBCNIBFAKE-BCNMAD-111103ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "17:25XOCYJBI66171ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz04hybdGb7LsNFrEtmori7aLoKClicONTKokla4R5N93Rhdbzq3ok01yLufMnBk9MmOhYD77cr1MZlPWY_yBi5xvRC7sPsqYfz4a9Ni_qtQS9ob5_zyyDAqubalhyi2gq-d4wzPXPfNG6H54xIdJuOjeJPuCbpNVsFjHy1XyYxKsZ5RRa_HAc3yaB9Pj-XXzp97bAPrOMwB1vD8AUCN-H8BNjwm5UaXE4jyyQqsHkYEOlbwV21JzK5Skug2dUb_HJNhYixTIlO_QyTJ_MPjo9Fhaag0y3WOG2fUKeZFtqHY7YQyG4JscXng6rzu2GFZwC_REqD8hj5Tj_zyvIMUqF6mApoPdujlnDhm3OX6Hk_inSlrNUztXGW91gqYaDMKQdipMSiEuOHXhlucGeuwWD6syrxDcdDCr0gq5pQjMQxhKwi--b5hbXaJnrn6lythDJJ5W0UOVtcE07Li-bw4bboAyBxWNGHTMjQG5BV1xL9oT-WPSYJqwo1OXv-e9yr_3MkZ4-WchEGXOjU1Eeg_EfnraD5d0TPWacCOQFVvG0SKKL128PqQmdR4pnNU0NMnSalGsgev0rq2geiCorbQ6XUCVCxQDQgiEzoVsI0Y0ygQxoG2QiN2JXM4_uJ7fH_vukKar0Tzz3dEQm5Nlgo48x4mwqJEV_CyFhgw5ckzK4svlgoYuiZIr-r2IVuvkxyKY0-EqOP6fzYPoit10Q1ad3EpS-mnQ3wTDIOi3Q2m-v8H6zgd37HtD33GOa-Cljef4rlPbdLfN12V4sky-_TXBMw6KNIXSdlHuNqRBNnLH1EmSLLxRelWAfqstRL0gLs1lslo3cmkuOmqh22aNxdeTqyh82bAN3275FiJ5q9DKjcNqcWyEDLH_pgk5C5eL5fwbqVype8TVfVx2WR6XZrSoSWqB4T-jMovDBFtI76RIeb62qjB_L6umHEKg6lsqX79_f6cRifvJHzxvxOtWbm3Vbp2km2sKJsWRqWtSpXy6eaokk0NqIZvUFaonhip6wXf4eWxn6GepLG3ri5OXevCoWoHMImNKWPMdVHlxKKpUTTEOEz3nWKFHXDAsEwaHeFPWdrhvQBv6h1US1aLsD73xyD2niUc5AH7Ds4AQ9h1aT7XNeDAYn1er5JkNskNy-EVPYV5pkBq8rgZebsuKKZtR8-C_QtRaebagaAP0DxtAIrHwDn0hWx0X8dP_leyweg.sdAGWO88K2_XPe1ULItJpEbp8CBnborYAKZvthGwc6A",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "17:25XOCYJBI66171ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "12:25XOCYJBI66121ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty4jgQ_ZUtPZMt21yy8ZsxZOOtAB5wtmZmKzUl7IZoYySPJGeWSuXft9sXMAnJ1DyBpL6c0326_cyMhYL57NPdIplOWI_xJy5yvha5sPsoY_7VaNBj_6pSS9gb5v_zzDIouLalhgm3gK6e4w0vXPfCG6H74REfxuG8e5PsC7pNlsF8FS-WybdxsJpSRq3FE8_xaRZMjufz5i-99wH0nVcA6ni_AKBG_DGA-x4Tcq1KicV5ZoVWTyIDHSq5EdtScyuUpLoNnVG_xyTYWIsUyJTv0MkyfzD43emxtNQaZLrHDNO7JfIi21DtdsIYDMHXObzxdM47thiWsAF6ItTUi5Tj_zyvIMUqF6mApoPdujkXzh9EusnxM5zEP1XSap7amcp4qxM01WAQhrQTYVIKcc2pCxueG-ixDR6WZV4huO9gVqUVcksRmIcwlIQffN8wt7pEz1z9SJWxh0g8raKHKmuDadhx_dgc1twAZQ4qGjHomBsDcgu64l60J_LHpMEkYUenLn_PO8u_9zZGePNrIRBlzo1NRPoIxH5y2g-XdEz1GnMjkBVbxNE8im9cvD6kJnUeKVzUNDTJ0mpRrIDr9KGtoHoiqK20Ol1AlQsUA0IIhM6FbCNGJB-CGNA2SMTuRC5Xv7me37_03SFNV6N55rujITYnywQdeY4TYVEjS_heCg0ZcuSYlMU3izkNXRIlt_R7HS1Xybd5MKPDbXD8P50F0S2774asOrmVpPTToD8JhkHQb4fS_HiD9R1i5g19xzmugTM2Q991apvutvm8CE-WyZe_xnjGQZGmUNrOy92aNMhGrkedJMnCO6VXBej32kLUC-LSXCbLVSOX5qKjFrpt1lh8N76NwrcNW_Ptlm8hkhuFVm4cVotjLWSI_TdNyGm4mC9mX0jlSj0iru7josvyuDSjeU1SCwz_JyqzOEywhfRBipTnK6sK8_eiasohBKq-pfL569cPGpG4fX_wuhHnrdzaqt06STfXBEyKI1PXpEr5cv9SSSaH1EI2ritUTwxV9Jrv8PPYztD3Ulna1tcnL_XgUbUCmUXGlLDiO6jy4lBUqZpiHCZ6xrFCz7hgWCYMDvG6rO1w34A29A-rJKpF2R96lyP3iiYe5QD4Dc8CQth3aD3VNpeDweVVtUpe2SA7JIdf9BRmlQapwatq4OW2rJiyKTUP_itErZVXC4o2QP-wASQSCx_QF7LlcRG__A9nO7Bo.FoQmWxnYIsakUpT2kUJIgGJCuMgvdFUzBqX7PoT_edo",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:25XOCYJBI66121ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 245.74,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:17MADBCNIBFAKE-BCNMAD-111121ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2kAQ_ZVqn0nlC4TAm7m1qNwKTqWqiqplPSHb2Lvu7joJQvx7Z2yTkJCL-gS7czsz58x6x6yDnHXZ98t5PBywBuN3XKZ8LVPptuOEdTvnzQb7owujYGtZ99eOJZBz4woDA-4AQwMvaJ35_llwjuGPRjT0-rPjm3ib0228jGarxXwZ_-5FqyFVNEbe8RRN02jwdH7dfd94G0DovQBQ5fsPABXi9wFcNZhUa10oHM6O5UbfyQRMX6truSkMd1IrmlsQXAQNpsAtjBRArjzDIIeWsPW54zeYKIwBJbZYY3i5xM7Iu6-zTFqLSfg6hZNY77P3WqDjD2BPC73ufIC8hGsgEzU5ir4Nz_ygddH0g_M2ESk4WtK07GehUykk1PQfD9078y5oYnXFj5uk8QmtnOHCTXXCDzJDpAYswlJuIK2gJCNOJF7z1EKDXeNhWaQlBkyhFdzzbd2xMwV6pPpeaOseI7gos_R1cggykHFzWx_W3AJViErACzALbi2oDZjKnnLrYiluwUm1GTzv2fexZ0MScEbmK-BG3Bxg6DsSw4HEI8ioKImzw2yRNKlUQMgw6bjHqmoRbV4ss2fT7Xzyg27Y7vohKbnWF24lzosniaQTT1F8Due5hL-FNJAgWo412eLrfEb6jsfxhH5H4-Uq_j2LpnSYRE__h9NoPGFXxynLaWwUqeR50g-SYRKMy5DG9x-L0KPG_HbX85427hWfsNusfU4X--XeoqiUzbVxsyJbE4-VrNGI_pjQ9wMijkQAb_CgczBvcUSDyKmz-pJVqqxPWKq-qN-NxWVvMu6fsCbwbVV95NvWgcP-fDaf_kTHtda3WPrY-PO4rUPiSVTSmlH_fANfUIn5o-wdiBslBU9XTuf2x5zEty9ZSUE4SHp8s8GgSpMEd8QzfOwPKv1baEcvz-iZpc5NACOVjK0tYMUziAkZCq9srvbJD2s05Qhqt8cHJ5EW92RdVH74ZoKx9A_lIRPiO2wF7XO_Q0uFQwb8JCURQQw9eu4rn3az2e743qnP_gpLWPxACZiWzNJMV-VOqU1RtsqGJA94yGXFxIt1piULyyVroZvCxvo3GAvJ8unB2P8Dbt1N-g.bAYOEi84sChKu5EWvGdmcBgdr4KPkDx5VT_6rel50Qo",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:17MADBCNIBFAKE-BCNMAD-111121ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "19:25XOCYJBI66013ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty4jgQ_ZUpPZMt21yy-M0YsvFWAC84WzOzlZoSdkO0MZJHkjNLpfLv2-0LmNym5gkk9e10nz5-YsZCwXz21-0ymU1Zj_FHLnK-Ebmwhyhj_ng06LF_VaklHAzz_3liGRRc21LDlFtAV8_xhheue-GN0P34iA-TcNG9SQ4F3SarYLGOl6vk2yRYzyij1uKR5_g0D6an89vmz733C-g7Lwqo4_1CAXXFHxdw12NCblQpsTlPrNDqUWSgQyW3YldqboWS1LehM-r3mAQba5ECmfI9OlnmDwa_OT2WllqDTA-YYXa7QlxkG6r9XhiDIfgmh1eeztuObQ0r2AI9UdVjxJFy_J_nVUmxykUqoJlgt2_OhfM7gW5y_KxOwp8qaTVP7VxlvOUJmmowWIa0U2FSCnHFaQpbnhvosS0eVmVeVXDXqVmVVsgdRWAelqEk_OCHBrnVJXrm6keqjD1G4mkVPVRZG0zDnuuH5rDhBihzUMGIQcfcGJA70BX2oj2RPyYNpgk7OXXxe96b-HuvY4TXvxYCq8y5sYlIH4DQT8_n4RKPqV8TbgSiYss4WkTxtYvXx9TEzhOEixqGJlpaLYo1cJ3etx1Uj1RqS63OFJDlAsmAJQRC50K2ESNaZSoxIDVIxP6MLuNPruf3L313SNvVcJ757miIw8kyQUee40ZY5MgKvpdCQ4YYOSZl8fVyQUuXRMkN_V5Fq3XybRHM6XATnP7P5kF0w-66IatJ7iQx_TzoT4JhEPTbIzU_VrC-88kd-97Qd5yTDLy28TzfdWqbrtp8XoZnYvLlzwmecVGkKZS2i3K_IQ6ykeP28YEoC--0XhWg3xsLQS8IS3OZrNYNXZqLDlvotpGx-HZyE4WvB7bhux3fQSS3Cq3cOKyEYyNkiPM3TchZuFws51-I5Uo9YF3dx2UX5Uk0o0UNUgsM_wcyszhusIX0XoqU52urCvP3shrKMQSyvoXy-evXDwaReI4_eDmIt63c2qpVnaSbawomxZWpe1KlfL57riiTQ2ohm9QdqjeGOnrF9_h5bHfoe6ksqfXV2Uu9eNStQGaRMSWs-R6qvLgUVaqmGceNnnPs0BMKDMuEwSXelLUd6g1oQ_-wS6ISyv7Quxy5pPEa6QD4Dc8CqrDvkDzVNpeDweW4kpIXNogOweEXPYV5xUEa8LpaeLkrK6RsRsOD_wpRc-WFQJEC9I8KIBFYeI--kK1OQvz8P4VSsGw.Hzaaj2LlGz7w6SNtzBKXd3Y0lkg2u5bXlEnd-axn9QE",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "19:25XOCYJBI66013ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "14:45XOCYJBI66021ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zYQ_ZUFn51Ckm-N3mTZaVTEl9pKsbtFsKClscNGJrUkla0R5N87o4stO04W-2STnNuZOXP0woyFnPnsr_t5PBmzDuPPXGR8LTJh91HK_OtBr8P-VYWWsDfM_-eFpZBzbQsNY24BXT3H61-57pU3QPfDIz6Mwln7Jt7ndBsvg9lqMV_G30bBakIZtRbPPMOnaTA-ni-bv3beL6DrnBVQxfuFAqqKPy7gocOEXKtCYnNeWK7Vs0hBh0puxLbQ3AolqW99Z9DtMAl2oUUCZMp36GSZ3-v95nRYUmgNMtljhsn9EnGRbah2O2EMhuDrDN54OpcdmxqWsAF6oqpdF4EkHA9ZVta0UJlIBNQjbDfOuXJ-J9R1kp8VSg1IlLSaJ3aqUt4QBU01GKxD2rEwCYW44TSGDc8MdNgGD8siKyt4aBWtCivkliIwD8tQEn7wfQ3d6gI9M_UjUcYeIvGkjB6qtAmmYcf1U31YcwOUOShhLEAvuDEgt6BL7HlzIn9MGoxjdnRq4_e8i_g7b2OEt78WAqvMuLGxSJ6A0I9P5-ESkalfI24EomLzRTSLFrc000NqoucRwlUFQxMvrRb5CrhOHpsOqmcqteFWawpIc4FkwBICoTMhm4gR7TKVGJAcxGJ3QpfrT67nd4e-26f1qknPfHfo4XDSVNCRZ7gSFjmyhO-F0JAiRo5J2eJ2PqOti6P4jn5vouUq_jYLpnS4C47_J9MgumMP7ZDlJLeSqH4a9CfBMAj67ZCaH0tY1_nk9vxe33ecow5csBkSeudcbj7PwxM1-fLnCM-4KNLkSttZsVsTB9nA8WiSRFl4p_UqB_3eWAh6Tljqy3i5qulSX7TYQre1ji3uR3dR-HZga77d8i1EcqNINxZhKRxrIUOcv6lDTsL5bD79QixX6gnraj_O2yiPqhnNKpBaYPg_kJn5YYMtJI9SJDxbWZWbv-flUA4hkPUNlM9fv34wiNgd-I53NojLVt3KqlGduJ1rDCbBlal6UqZ8fXgtKZNBYiEdVR2qNoY6esN3-H1sduh7oSzJ9c3JS7V41K1AppExBaz4Dsq8uBRlqroZh42ecuzQCwoMS4XBJV4XlR3qDWhD_7BLohTKbt8bDtxr2nikA-BHPA2owq5D8lTZDHu94XUpJWc2iA7B4Sc9gWnJQRrwqlx4uS1KpGxCw4P_clFx5UygSAG6BwWQCCx8RF9Il0chfv0fQOKwoA.Qz6DzhbaeycTwicpfDG-2Rg24KJm_cHxaQl44DQR3qQ",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "14:45XOCYJBI66021ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "11:25XOCYJBI66111ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zYQ_ZUFn51C8i2N3mTZaVTEtiorxe4WwYKWxg4bmdSSVLZGkH_vjC62nDhZ7JNNci7nzJwZPTNjoWAe--tumcymrMf4Exc5X4tc2H2YMe9qPOyxf1WpJewN8_55ZhkUXNtSw5RbQNe-0x9duO5Ff4zuh0d8mASL7k2yL-g2if3FKlrGybeJv5pRRq3FE8_xae5Pj-fz5i-99wEMnFcA6ni_AKBG_DGA-x4Tcq1KicV5ZoVWTyIDHSi5EdtScyuUpLqNnPGgxyTYSIsUyJTv0Mkybzj8zemxtNQaZLrHDLO7GHmRbaB2O2EMhuDrHN54OucdWwwxbICeCPUIeaQc_-d5BSlSuUgFNB3s1s25cH4n0k2On-Ek_qmSVvPUzlXGW52gqQaDMKSdCpNSiGtOXdjw3ECPbfAQl3mF4L6DWZVWyC1FYH2EoST84PuGudUleubqR6qMPUTiaRU9UFkbTMOO68fmsOYGKLNf0YhAR9wYkFvQFfeiPZE_JvWnCTs6dfn3-2f5997GCG5-LQSizLmxiUgfgdhPT_vhko6pXhNuBLJiyyhchNGNi9eH1KTOI4WLmoYmWVotihVwnT60FVRPBLWVVqcLqHKBYkAIvtC5kG3EkEaZIPq0DRKxO5HL1Se37w0uPZdEljWaZ547HmFzskzQkec4ERY1EsP3UmjIkCPHpCy6WS5o6JIwuaXf6zBeJd8W_pwOt_7x_2zuh7fsvhuy6uRWktJPg_4kGAZBvx1K8-MNNnA-ua7XH3mOc1wDZ2yGnuvUNt1t83kZnCyTL39O8IyDIk2htF2UuzVpkI1dlzpJkoV3Sq8K0O-1hagXxKW5TOJVI5fmoqMWum3WWHQ3uQ2Dtw1b8-2WbyGUG4VWbhRUi2MtZID9N03IWbBcLOdfSOVKPSKu7uOyy_K4NMNFTVILDP8HKrM4TLCF9EGKlOcrqwrz97JqyiEEqr6l8vnr1w8akaAMh68bcd7Kra3arZN0c03BpDgydU2qlC_3L5VkckgtZJO6QvXEUEWv-Q4_j-0MfS-VpW19ffJSDx5Vy5dZaEwJK76DKi8ORZWqKcZhouccK_SMC4ZlwuAQr8vaDvcNaEP_sEqiWpSDUf9y7F7RxKMcAL_hmU8IBw6tp9rmcji8vKpWySsbZIfk8IuewrzSIDV4VQ283JYVUzaj5sF_hai18mpB0QYYHDaARGLBA_pCFh8X8cv_VFSwYg.48TVzxjQkkZVUj7rsoIEhd0i1hIUkwOSJZjvJnQGBNY",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "11:25XOCYJBI66111ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 45.83,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "20:25XOCYJBI66201ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty4jgQ_ZUpPZMt21yy8ZsxZOOtAF5wtmZmKzUl7IZoYySPJGeWSuXft9sXMAnJ1DyBpL6d7tPHz8xYKJjP_rpbJNMJ6zH-xEXO1yIXdh9lzL8aDXrsX1VqCXvD_H-eWQYF17bUMOEW0NVzvOGF6154I3Q_POLDOJx3b5J9QbfJMpiv4sUy-TYOVlPKqLV44jk-zYLJ8Xze_KX3fgF951UBdbxfKKCu-OMC7ntMyLUqJTbnmRVaPYkMdKjkRmxLza1Qkvo2dEb9HpNgYy1SIFO-QyfL_MHgN6fH0lJrkOkeM0zvloiLbEO12wljMARf5_DG0znv2NawhA3QE1XtUi9Sjoc8r2qKVS5SAc0Iu41zLpzfCXWT5GeFUgNSJa3mqZ2pjLdEQVMNBuuQdiJMSiGuOY1hw3MDPbbBw7LMqwruO0Wr0gq5pQjMwzKUhB9830C3ukTPXP1IlbGHSDytoocqa4Np2HH92BzW3ABlDioYMeiYGwNyC7rCXrQn8sekwSRhR6cufs87i7_3NkZ482shsMqcG5uI9BEI_eR0HtXwqF9jbgSiYos4mkfxjYvXh9REzyOEixqGJl5aLYoVcJ0-tB1UT1Rqy63OFJDmAsmAJQRC50K2ESPaZSoxIDlIxO6ELlefXM_vX_rukNarIT3z3dEQh5Nlgo48x5WwyJElfC-FhgwxckzK4pvFnLYuiZJb-r2Olqvk2zyY0eE2OP6fzoLolt13Q1aT3Eqi-mnQnwTDIOi3Q2p-LGF955Pn-N7Qd5yjDpyx6fuuU9t05ebzIjxRky9_jvGMiyJNobSdl7s1cZCNPIcmSZSFd1qvCtDvjYWgF4SluUyWq4YuzUWHLXTb6Fh8N76NwrcDW_Ptlm8hkhtFuhGHlXCshQxx_qYJOQ0X88XsC7FcqUesq_u46KI8qmY0r0FqgeH_QGYWhw22kD5IkfJ8ZVVh_l5UQzmEQNa3UD5__frBIBLP9Qfuq0Gct_Jqq1Z1km6uCZgUV6buSZXy5f6lokwOqYVsXHeo3hjq6DXf4fex3aHvpbIk19cnL_XiUbcCmUXGlLDiO6jy4lJUqZpmHDZ6xrFDzygwLBMGl3hd1naoN6AN_cMuiUoo-0PvcuRe0cYjHQA_4llAFfYdkqfa5nIwuLyqpOSVDaJDcPhJT2FWcZAGvKoWXm7LCimb0vDgv0LUXHklUKQA_YMCSAQWPqAvZMujEL_8Dw4OsJA.4tlekP1sFQ24y6khTq-PEjupzNbeggkNKNOCJJnaugU",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "20:25XOCYJBI66201ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 180.4,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": false,
            "inboundRef": "12:10MADBCNIBFAKE-BCNMAD-111120ECONOMY",
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVVlv2zAM_iuDntPBR9ukfnOuLViuJe6AYSgGRWZTrbbkSXLbIMh_H2k7bdr0wJ4SitdH8iO9ZdZBwSL2_XKWDPqsxfgdlxlfyUy6zShl0cX5aYv90aVRsLEs-rVlKRTcuNJAnztA18ALzk58_yQ4R_dHJSq6venhS7Ip6DVZxNPlfLZIfnfj5YAyGiPveIaqSdx_kl8337XeBhB6LwDU8f4DQI34fQBXLSbVSpcKm7NlhdF3MgXT0-parkvDndSK-hYEnaDFFLi5kQLIlOfo5Fjkt8PPfqfFRGkMKLHBHIPLBVZG1j2d59JaDMJXGRz5ep-91xwdfwB7ZBy8bryHvIBrIBUVOYy_DU784Kxz6gfnbRqk4KjJsqqeuc6kkNCM_7Dp3onXoY41GT8uktontHKGCzfRKd_TDJEasAhLub60goIMOQ3xmmcWWuwahUWZVRgwhFZwzzdNxc6UaJHpe6Gte_TgoorS0-neyUDOzW0jrLgFyhBXgOdg5txaUGswtT7j1iVS3IKTat1_XrPvY82GKOCMLJbAjbjZw9B3RIb9EA8gI6Mk9g6jxdJkUgEhw6CjLquzxbR5icyfdffikx9EYTvyQ2Jywy8WdbBfPE0lSTxD8jns5wL-ltJAimg55mTzr7Mp8TsZJWP6HY4Wy-T3NJ6QMI6f_g8m8WjMrg5DVt1YK2LJ86AfBMMg6JfjGN8_FqFHhfle5HlPG_eKTRiFjc3xYr_cWySVsoU2blrmK5pjTWtUoj0G9P2AAhEJ4I056ALMWzOiRhRUWfPIalY2EqZqHpq7Mb_sjke9o6kJvK2qh_O2jeOgN5vOJj_RcKX1LaY-VP48LGsfeBxXY82pfr6GL8jE4pH2DsSNkoJnS6cL-2NG5NtVU8lAOEi7fL1Gp5qTBHfIczz2e5b-LbWjyzN8pmliE8BYpSNrS1jyHBJChsSrimtsiv0aTTiC2u7w4KTS4p6sytoObyYYS_-QHjKleYdnQfvcv6ClwiYDfpLSmCCGHp372qZ9etq-8L1jm90VprD4gRIwqSZLPV1WO6XWZVUqGxA94KGQ9SRerDMtWVgt2RmaKSysd4O-kC6eDsbuH0CYTeg.840AbKls-KLu0I6eyh9EKyxqmN-uraCDIQXI5ScAMD0",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:10MADBCNIBFAKE-BCNMAD-111120ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 119.52,
                    "currency": "EUR"
                }
            },
            "hasFareFamilyUpSell": true,
            "inboundRef": "07:30MADBCNUX7701ECONOMY",
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "LITE",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz04h-RI5epNlZ2vAt7WVxRaLoKClscONRKokla4R5N93hpJsx0la9MkmOZdzZs6MnpmxULKQ_Xm3TCZj1mH8iYucb0Uu7GGasfDmut9h_6pKSzgYFv7zzDIoubaVhjG3gK5drzu48v2r7jW6Hx_xYRQvzm-SQ0m3yTpabFbLdfJtFG0mlFFr8cRzfJpH49P5ffOXzscAet4FgDrebwCoEf8cwH2HCblVlcTiPLNSqyeRgY6V3Il9pbkVSlLdBt51r8Mk2JUWKZApL9DJstD3-58DLGpaaQ0yPWCOyd0amZF1rIpCGINB-DaHN77eZ-89xxbFGnZAT4Tb7yOVlOMhzx2qlcpFKqBp4nnpvCtvSLybJL-GSkVIlbSap3auMt6KBcFpMIhE2rEwKQW55dSKHc8NdNgOD-sqdxjuz2Crygq5pwisi0CUhB_80JC3ukLPXP1IlbHHSDx10WOVtcE0FFw_NoctN0CZI0dkBXrFjQG5B-3Yl-2J_DFpNE7Yyem8Ar3gvYqTCi9jxF9-LwSizLmxiUgfgdiPX3fEJzFTvUbcCOMwfl0OZnh5TEwCPRG4cgA0CdNqUW6A6_ShLZ96IpyttM5agDoXqAXMHwmdC9kGvPub1fgi2geJKF6p5eaT30VeoT-g-WpUz8LhABuTZYJOPMeRsKiPNXyvhIYM-XHMyVZflguaumSazOj3drreJN8W0ZwOs-j0fzKPpjN2fx7SdXEvSeivg_4iGAZBvwJl-fMV1vM-eUHY80LPO-2Bd2yG4WBQ27xdN5fbBIdEmlJpu6iKLemPBYHn4wPJFT6ovCpBf9QVol4Sl-YyGA4bqRzF0CiF7pottrobzabxm25t-X7P9zCVO4VG3ip2O2MrZIy9N028SbxcLOdfSd5KPSKo88fonGKbbBa5FhdUCwz_B6qyPI6uhfRBipTnG6tK89eShPjiOpRDaiEb1ZhqfRKFW17g56hV7PdKWdqNt69eapkTvkhmU2Mq2PACEgKGGnR8m_TH8ZlzxPSMs8wyYXBktlVth6MN2tA_VIpwO6k36AbX_g3NF1Yf8JuZRYSw59EmqG2Cfj-4cVN7YfNyjykMfkFTmLuWU0k3brzkvnJM2YSUAv-Vom7OxS6geesd500isfgBfSFbn3bey_9C2IN2.CfSHgMD5c0v4vauLa4J8DFxNmp9qkB_Z-YAOFi3K41w",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "07:30MADBCNUX7701ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "05:45YJBXOCI66060ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVVtz2joQ_isdPZMz5h78Zgw5cSeAC86ZtmcyHWEvRI2RXElOy2Ty37vrC5iENNMnkLS3b_fbz0_MWMiYyz7dLqLphLUYf-Qi5WuRCrsPEuaOBr0W-65yLWFvmPv_E0sg49rmGibcArp2nE7_ot2-6AzQ_fCID2N_3ryJ9hndRktvvgoXy-jb2FtNKaPW4pGn-DTzJsfzefPn1tsFdJ0XBZTx_qKAsuI_F3DXYiq3a5VL7M4Ty7R6FAloX8mN2OaaW6EkNa7vDLotJsGGWsRApnyHTpa5vd4_TovFudYg4z2mmN4uERjZ-mq3E8ZgCL5O4ZWnc96xrmEJG6AnKpuGEXP8n6ZFSaFKRSygGmGzcc6Fc0moqxzv1UkNiJW0msd2phJeEwVNNRgsQ9qJMDGFuOI0hg1PDbTYBg_LPC0quGvUjM0UcksRWBvLUBJ-8n2F3OocPVP1M1bGHiLxuIjuq6QOpmHH9UN1WHMDlNkrYISgQ24MyC3oAntWn8gfk3qTiB2dmvg7nbP4W69j-Nd_FwKrTLmxkYgfgNBPTufRJiJTv8bcCETFFmEwD8Jr6s8hNdHzCOGihKGJllaLbAVcx_d1B9UjlVpTqzEFpLlAMmAJntCpkHXEgOhDJXokB5HYndBl9KHdcbtDt92n9ao4z9w2EZ4niaAjT3EjLHJkCT9yoSFBjByTsvB6Maeti4Lohn6vguUq-jb3ZnS48Y7_pzMvuGF3zZDFJLeSmH4a9J1gGAT9dkjN9yTsg9N3e33XcY46cMbm0u1cljZNufnycXyiJp8XPp5xUaTJlLbzfLcmDrKBMyBXoiy80XqVgX5rLAQ9IyzVZbRcVXSpLhpsodtKx8Lb8U3gvx7Ymm-3fAuB3ChawdAvhGMtpI_zN1XIqb-YL2ZfiOVKPWBdzcdFE-VRNYN5CVILDP8vMjM7bLCF-F6KmKcrqzLz36IYyiEEsr6G8vnr1z8MInKGrvNyEOetRqVVrTpRM9cETIwrU_akSPl891xQJoXYQjIuO1RuDHX0iu_w-1jv0I9cWVLrq5OXcvGoW55MAmNyWPEdFHlxKYpUVTMOGz3j2KEnFBiWCINLvM5LO9Qb0Ib-YZcECWWn2-8MB-0RbTzSAfAjnnhUYdcheSpthr3ecFRIyQsbRIfg8JMew6zgIA14VSy83OYFUjal4cGvTJRceSFQpADdgwJIBObfoy8ky6MQP_8GyVmxFw.kuG43evweKdQRRjUdCX0SUgzPFAcNZIgCL5yAT6i1Ow",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "05:45YJBXOCI66060ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 249.98,
                    "currency": "EUR"
                }
            },
            "outboundRef": "08:40BCNPMIUX6007ECONOMY_10:35PMIMADUX6030ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "LITE",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJy1Vtlu2zoQ_ZWCz04hW15ivcmyc2PAW23loguCgpbGDhuJVEkqqRHk3--MJK9xahTofbJJznJm5vBQL8xYyJjHPt1Nw0Gf1Rh_4iLhS5EIuxnGzOu2mzX2Q-VawsYw79sLiyHj2uYa-twCujacRuuqXr9qtNF9d4gHvWByuBNuMtoN5_5kMZvOw-89fzGgjFqLJ57g0djv79fnzV9r7wNwnRMAZbw_AFAi_j2A-xpTuV2qXGJ3Xlim1ZOIQQdKrsQ619wKJalxLaft1pgEO9MiAjLlKTpZ5tVb7scGdjXKtQYZbTDJ4G6OpZF1oNJUGINB-DKBN77OR-ec4xbFHFZARwS83sFaIo6LJClQzVQiIgHVFA9751w511R4leQyVOpCpKTVPLJjFfMtWxCcBoNIpO0LE1GQG06zWPHEQI2tcDHPkwLD_QFs7KiQa4rA6ghESXjmm6p4q3P0TNRzpIzdReJRET1Q8TaYhpTrx2qx5AYos18UMgM948aAXIMuqs-2K_LHpH4_ZHunww5gA850nGh4GiO4_bMQiDLhxoYiegSqvn88kTqxmfrV40ZgVexr_8vUHeHmLjExdF_AVQFAEzGtFtkCuI4etu1TT4RzS62DESDRBXIB8_tCJ0JuA959ZiU-nwQhFOkRW7of6g3P7SA_6IJVrGdew8FCeRwLWvIE74RFgszhZy40xFggx6Rsdjud0L0Lh-GIfm-G80X4feKPaTHy9_8HY384YveHIYsxriUx_TjohWAYBP1S5OUlEfvgXHtNx3OcvRKcsel6jVZp81bx9noyGw9xjbdEmkxpO8nTJRGQtR2HLifxFd5pvcpAvzcWKj2jWqrNjntbcaXa2FGF9iodm931RsPgaFzNFhF2veZrGMqVQiNnFhSisRQywOGbKt4gmE6m4y_Eb6UeEdTh4dfDErfJRn4x4pR6geH_QVpmu7trIXqQIuLJwqrM_DslJv5O2LHhdcdzWxeGgpR0nLdDKYdw-sqcG0rxgPxvQ5n0m9PW5aFc_5WhTP7OUIprk0BkIe6VmErVoBJueIpfCVsd-ZkrSy_WzdFJKT6Ez5fx0JgcFjyFkIChMBT1Vul3ojbmiOkFFZbFwqCQLfPSDgUXtKF_eH0FvRQNt9XotOtdUj3sPuCnTOwTQtchNpU2nWaz0y209MTmFSnHDH7YRDAuRk4tXRSiJ9d5USkbUBvhVybK4ZwoNKmgu1NBiYUFD-gL8Xz_Er3-B6kmAso.V2M4y6aVoUvwDnbNSFZrTaahKOV74ei_QwBprn-iLmw",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "08:40BCNPMIUX6007ECONOMY",
                    "baggageAllowance": "0 PC"
                },
                {
                    "segmentRef": "10:35PMIMADUX6030ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 202.83,
                    "currency": "EUR"
                }
            },
            "outboundRef": "20:30BCNMADUX7708ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "LITE",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVW1P4kAQ_itmP6MpRajyrRQ8SXg7qJczF2OWdsA92926u9Ujxv9-M30BRDxzn2B3Z555ZuaZ6SszFjLWZd9vpuGgzxqMP3OR8KVIhN0MY9a97Jw32G-Vawkbw7q_XlkMGdc219DnFtDVddz2abN56nbQffuID71gsn8TbjK6Def-ZDGbzsP7nr8YUEStxTNP8Gns93fn4-Zvjc8JtJwDAiXefxAoGf-bwF2DqdwuVS6xOq8s0-pZxKADJVdinWtuhZJUuLbTaTWYBDvTIgIy5Sk6WdZttp0zz22wKNcaZLTBIIObOaZG1oFKU2EMgvBlAh98nTPnmGPNYg4roCci3qR-RBwPSVKwmqlERAKqLu7Xzjl1LijxKsjXVKkKkZJW88iOVcxrtSA5DQaZSNsXJiKQK069WPHEQIOt8DDPk4LD3R5trKiQa0JgTSSiJLzwTZW81Tl6JuolUsZukXhUoAcqrsE0pFw_VoclN0CR_SKRGegZNwbkGnSRfVafyB-D-v2Q7Zz2K9DxjlWcZHiIEVx_AnHePgqBLBNubCiiR6Ds--870iQ1U7163AhDQuzfTtsjvNwGJoXuEjgtCGgSptUiWwDX0UNdPvVMPGtp7bUAhS5QCxjfFzoRsga8-clKfj4thFCk79RyedJ0uy0P9UEDVqkelwXmyeNY0IknOBIW9TGHp1xoiDE_jjHZ7Ho6obELh-GIfq-G80V4P_HHdBj5u_-DsT8csbt9yKKLa0lCfw_6BRiCoF-Ksvxqh524TrfldB1ntwiO2LhoUNp8XHiH-wyHRJpMaTvJ0yXpj3leMW4kV_ik8ioD_VlXKPWMcqkuvQuvkkp1sVUK3VVrbHbTGw2DD91a8vWar2EoVwqNnFlQ7IylkAH23lR4g2A6mY5vSd5KPSKp_cdwP8U62MgvWpxSLRD-G6oy246uhehBiognC6sy82NKQnwrOpRAZCHulZxKfVIKVzzF71Gt2KdcWdqNV-9eSpkTP1_GQ2NyWPAUQiKGGizyrcJvx2fMkdMrzjKLhcGRWealHY42aEP_UCmCdpLbartep3lJ84XVB_xoxj4xbDm0CUob7_zcuyym9sDm7Q5DGPyERjAuWk4lXRTjJdd5kSkbkHLgTybK5hzsApq31nbeJCYWPKAvxPPdznv7C2AthCQ.cM1lLghhICZu7X4AFp13bLcHovWCgpjx8kqs1Yw7Dlg",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "20:30BCNMADUX7708ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "09:50YJBXOCI66010ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zYQ_ZUFn51C8i2132TZaVTEliorxe4WwYKWxg4bmdSSVLZGkH_vjC62nMsG-2STnMs5M2dGT8xYKNiU_XUbJos56zH-yEXONyIX9hBkbDoZD3vsX1VqCQfDpv88sQwKrm2pYc4toGvf6Y8uXPeiP0b34yM-zPxV9yY5FHSbxN5qHYVx8m3mrReUUWvxyHN8Wnrz0_lt8-fe-wAGzgsAdbxfAFAj_jmAux5Tpd2oUmJ1nlih1aPIQPtKbsWu1NwKJalwI2c86DEJNtIiBTLle3SybDoc_ub0WFpqDTI9YIrFbYzEyNZX-70wBkPwTQ6vPJ23HVsMMWyBngj270gk5fg_zytIkcpFKqBpYbdwzoVDxm2Oj3BSAVIlreapXaqMt0JBUw0GYUg7FyalEFec2rDluYEe2-IhLvMKwV0HMxZTyB1FYC7CUBJ-8EPD3OoSPXP1I1XGHiPxtIruq6wNpmHP9UNz2HADlNmraESgI24MyB3oinvRnsgfk3rzhJ2cuvz7_Tf5917H8K9_LQSizLmxiUgfgNjPz_vhkpCpXjNuBLJiYRSsguia6nNMTfI8UbioaWiSpdWiWAPX6X1bQfVIUFtpdbqAMhcoBoTgCZ0L2UYMaJYJokfrIBH7M7lMPrn96eBy6o5ovBrNs6k7HmFzskzQkec4ERY1EsP3UmjIkCPHpCy6Dlc0dUmQ3NDvVRCvk28rb0mHG-_0f7H0ght21w1ZdXInSennQT8IhkHQb4_S_GiFfXImOLlTxzntgdc2xH5U23TXzZc_Z2fb5HPo4xkHRZpCabsq9xvSIBs7VYNJsvBO6VUB-r22EPWCuDSXSbxu5NJcdNRCt80ei25nN4H_umEbvtvxHQRyq2gEI79aHBshfey_aUIu_HAVLr-QypV6QFzdx7DL8rQ1g1VNUgsM_wcqszhOsIX0XoqU52urCvN3WDXlGAJV31L5_PXrTxqRuO7UHbxoxNtWw9qq3TpJN9ccTIojU9ekSvl891xJJofUQjarK1RPDFX0iu_x-9jO0PdSWdrWV2cv9eBRtTyZBcaUsOZ7qPLiUFSpmmIcJ3rJsUJPuGBYJgwO8aas7XDfgDb0D6skaFH2B6P-5did0MSjHAA_4plHCAcOrafa5nI4vJxUSnthg-yQHH7SU1hWGqQGr6uBl7uyYsoW1Dz4rxC1Vl4sKNoAg-MGkEjMv0dfyOLTIn7-H6NCsP8.tZG_Eo1tM1XArD6e8vbpEKVL35IhpIDFrWlqod8o42I",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "09:50YJBXOCI66010ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:40YJBXOCI66130ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zYQ_ZWCz04h-ZZGb7LsNCpiWysrxe4WwYKWxg4bmdSSVLZGkH_vjC62nDgb7JNNcm5n5szRMzMWCuaxT3fLZDZlPcafuMj5WuTC7sOMeVfjYY_9q0otYW-Y988zy6Dg2pYaptwCuvad_ujCdS_6Y3Q_POLDJFh0b5J9QbdJ7C9W0TJOvk381Ywyai2eeI5Pc396PJ83f-m9X8DAeVVAHe8XCqgr_nkB9z2mSrtWpcTuPLNCqyeRgQ6U3IhtqbkVSlLjRs540GMSbKRFCmTKd-hkmTcc_u70WFpqDTLdY4rZXYzAyDZQu50wBkPwdQ5vPJ3zjm0NMWyAnqhsl5qRcjzkeVVTpHKRCmhm2O2cc-H8QbCbJB8VSh1IlbSap3auMt4yBU01GKxD2qkwKYW45jSHDc8N9NgGD3GZVxXcd4rGbgq5pQjMxTKUhB9830C3ukTPXP1IlbGHSDytogcqa4Np2HH92BzW3ABl9isYEeiIGwNyC7rCXrQn8sek_jRhR6cu_n7_LP7e2xjBza-FwCpzbmwi0kcg9NPTeVTDo35NuBGIii2jcBFGN9SfQ2ri5xHCRQ1DEy-tFsUKuE4f2g6qJyq15VZnCshzgWTAEnyhcyHbiCEtM5Xokx4kYndCl6vf3L43uPTcEe1XQ3rmueMRDifLBB15jithkSMxfC-FhgwxckzKopvlgtYuCZNb-r0O41XybeHP6XDrH__P5n54y-67IatJbiVR_TToB8EwCPrtkJofaRghGzqe4xyF4IzNyOuPapuu3nz5a3IiJ5-XAZ5xUaQplLaLcrcmDrKxW0kVURbeab0qQL83FoJeEJbmMolXDV2aiw5b6LYRsuhuchsGbwe25tst30IoN4pWMAoq4VgLGeD8TRNyFiwXy_kXYrlSj1hX93HZRXmUzXBRg9QCw_-JzCwOG2whfZAi5fnKqsL8vayGcgiBrG-hfP769SeDSNyh5wxeDeK81bC2alUn6eaagklxZeqeVClf7l8qyuSQWsgmdYfqjaGOXvMdfiDbHfpeKktyfX3yUi8edcuXWWhMCSu-gyovLkWVqmnGYaPnHDv0jALDMmFwiddlbYd6A9rQP-ySIKHsD0b9y7F7RRuPdAD8imc-VThwSJ5qm8vh8PKqkpJXNogOweE3PYV5xUEa8KpaeLktK6RsRsOD_wpRc-WVQJECDA4KIBFY8IC-kMVHIX75H0UOsSo.luuiEzi2zgebco0khMwJRsD1xaejvQSoj9nUcTEA1xQ",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:40YJBXOCI66130ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "07:05YJBXOCI66270ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zYQ_ZUFn51Clm-13mTZaVTElmorRRdFsKClscNGIrUkla0R5N87I8m2nEuDfbJJzuWcmTOjZ2YslMxjf9xFyWLOeow_cZHzrciFPYQZ86bjYY_9oyot4WCY9_czy6Dk2lYa5twCurqOO7rq96_cMbqfHvFhFqy6N8mhpNtk7a82cbROvs38zYIyai2eeI5PS39-Pr9v_tL7GMDAeQWgifcTABrE_w_gvsdUZbeqklidZ1Zq9SQy0IGSO7GvNLdCSSrcyBkPekyCjbVIgUx5gU6WecPhL06PpZXWINMDpljcrZEY2QaqKIQxGIJvc3jj6bzveMSwhh3QE8HuI5GU4_88ryHFKhepgLaF3cI5V86vxLrN8RlOKkCqpNU8tUuV8aNQ0FSDQRjSzoVJKcQ1pzbseG6gx3Z4WFd5jeC-gxmLKeSeItSYlYQf_NAyt7pCz1z9SJWxp0g8raMHKjsG01Bw_dgettwAZfZrGjHomBsDcg-65l4eT-SPSf15ws5OXf6u-y7_3tsYwc3PhUCUOTc2EekjEPv5ZT_6JGSq14wbgaxYFIerML6h-pxSkzzPFK4aGppkabUoN8B1-nCsoHoiqEdpdbqAMhcoBoTgC50LeYwY0iwTRJ_WQSKKC7lMv_RdbzDx-iMar1bzDI_IlWeZoCPPcSIsamQN3yuhIUOOHJOy-CZa0dQlYXJLv9fhepN8W_lLOtz65_-LpR_esvtuyLqTe0lKvwz6STAMgn4FSvOzFfbFmXjOyHOc8x54x2bqDVqb7rr5-vvsYpv8FQV4xkGRplTarqpiSxpkY3dCriRZ-KD0qgT9UVuIeklc2stkvWnl0l501EK37R6L72a3YfC2YVu-3_M9hHKnaATjoF4cWyED7L9pQy6CaBUtv5LKlXpEXN3HqMvyvDXDVUNSCwz_GyqzPE2whfRBipTnG6tK82dEYnypm5RDaiGbNZgajRKHa17gF-mo2u-VsrQfry9eGqkTPl9moTEVbHgBCQFDGdaE2_SnGVpyxPSMI80yYXBstlVjhxMO2tA_FIug1eQORu5k3J_SjGEDAD-bmU8IBw4thMZmMhxOpvXwvrJ5uccUBj-iKSzrrlNJN_WIyX1VM2ULKhf8W4qmO69WAs3c4DRzEokFD-gL2fq8-l7-Awo7hNI.EPKhPi__JGrGBbi4iqiqn33OEGlV40Zhxjz19aesBJk",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "07:05YJBXOCI66270ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 249.98,
                    "currency": "EUR"
                }
            },
            "outboundRef": "08:40BCNPMIUX6007ECONOMY_12:25PMIMADUX6048ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "LITE",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJy1Vllv2zgQ_isFn51CsnzEfpNlZ2PA19rKogeCgpbGDjcSqZJUWiPIf98ZHb7iNCjQfbJJzvHNzMePembGQsb67O-7eTgasgbjT1wkfC0SYXfjmPV7nVaD_atyLWFnWP_rM4sh49rmGobcAro2nWb7ynWvmh103x_iwSCYHe-Eu4x2w6U_Wy3my_DbwF-NKKPW4okneDT1h4f1ZfOXxtsAPOcMQBnvNwCUiH8N4L7BVG7XKpfYnWeWafUkYtCBkhuxzTW3QklqXNvpeA0mwS60iIBMeYpOlvXdtvexiV2Ncq1BRjtMMrpbYmlkHag0FcZgEL5O4JWv89G55FijWMIG6IiAu9dYS8RxkSQFqoVKRCSgmuJx75wrh4zrJO9DpS5ESlrNIztVMa_ZguA0GEQi7VCYiILccJrFhicGGmyDi2WeFBjuj2BjR4XcUgTmIhAl4QffVcVbnaNnon5Eyth9JB4V0QMV18E0pFw_Vos1N0CZ_aKQBegFNwbkFnRRfVavyB-T-sOQHZyOO4ANuNBxouF5jOD290IgyoQbG4roEaj64elEXGIz9WvAjcCq2Jfh57k3wc19YmLooYCrAoAmYlotshVwHT3U7VNPhLOm1tEIkOgCuYD5faETIeuAd59Yic8nQQhFesKW3ge32fe6yA-6YBXrWd9zsVAex4KWPME7YZEgS_ieCw0xFsgxKVvczmd078JxOKHfm_FyFX6b-VNaTPzD_9HUH0_Y_XHIYoxbSUw_DfpOMAyCfiny8j0R--Bc91tO33EOSnDBptdvtkub14p30JPFdIxrvCXSZErbWZ6uiYCs4zhdPCC-whutVxnot8ZCpWdUS7XZ9W4rrlQbe6rQXqVji7vBZBycjKvVJsJut3wLY7lRaOQsgkI01kIGOHxTxRsF89l8-pn4rdQjgjo-_HJcYp1s4hcjTqkXGP4vpGW2v7sWogcpIp6srMrMP3Ni4q-EHRuOdKsb_uZQXA9F9_VQyiGcvzKXhtK6_j-HMhu25u33h3L9R4Yy-zNDKa5NApGFeFBiKlWDSrjhKX4l1DryPVeWXqybk5NSfAifL-OxMTmseAohAUNhKOqt0u9FbcoR0zMqLIuFQSFb56UdCi5oQ__w-gp6KZpeu9ntuD1SPew-4KdM7BNCzyE2lTbdVqvbK7T0zOYFKccMfthEMC1GTi1dFaInt3lRKRtRG-FnJsrhnCk0qaC3V0GJhQUP6Avx8vASvfwH4eQC3Q.0NK9zmYGmxSlWB83rM0yebHWvDBMaVue0xbPVD-zV38",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "08:40BCNPMIUX6007ECONOMY",
                    "baggageAllowance": "0 PC"
                },
                {
                    "segmentRef": "12:25PMIMADUX6048ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "19:05YJBXOCI66190ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty2kgQ_ZXUPOOUJMAOehMCx9oyoIC8lWTLlRqkBs9azCgzI2cpl_99u3UB4UtceYKZ6dvpPn30yIyFgvnsy80imU5Yj_EHLnK-Frmw-yhj_uh80GP_qlJL2Bvm__PIMii4tqWGCbeArp7jDc9c98w7R_fDIz6Mw3n3JtkXdJssg_kqXiyTH-NgNaWMWosHnuPTLJgcz6-bP_XeLqDvPCugjvcHBdQV_76A2x5TpV2rUmJ3Hlmh1YPIQIdKbsS21NwKJalxQ-e832MSbKxFCmTKd-hkmT8YfHR6LC21BpnuMcX0ZonAyDZUu50wBkPwdQ4vPJ3XHdsalrABeqKy3T4iSTke8ryqKVa5SAU0M-x2zjlzPhHsJsl7hVIHUiWt5qmdqYy3TEFTDQbrkHYiTEohLjnNYcNzAz22wcOyzKsKbjtFYzeF3FIE5mIZSsIvvm-gW12iZ65-pcrYQySeVtFDlbXBNOy4vm8Oa26AMgcVjBh0zI0BuQVdYS_aE_lj0mCSsKNTF7_nvYq_9zJGePVnIbDKnBubiPQeCP3kdB4uMZn6NeZGICq2iKN5FF9Rfw6piZ9HCGc1DE28tFoUK-A6vWs7qB6o1JZbnSkgzwWSAUsIhM6FbCNGtMxUYkB6kIjdCV1GH1zP71_47pD2qyE9893zIQ4nywQdeY4rYZEjS_hZCg0ZYuSYlMVXizmtXRIl1_R7GS1XyY95MKPDdXD8P50F0TW77YasJrmVRPXToO8EwyDot0NqvqdhH9yR7wx9xzkKwUsbz8X1rm26evPtr_GJnHxdhHjGRZGmUNrOy92aOMjO3RG5EmXhjdarAvRbYyHoBWFpLpPlqqFLc9FhC902QhbfjK-j8OXA1ny75VuI5EbRCsZhJRxrIUOcv2lCTsPFfDH7RixX6h7r6j4uuiiPshnNa5BaYPjPyMzisMEW0jspUp6vrCrM34tqKIcQyPoWytfv338ziMRzfO_Ts0G8bjWqrVrVSbq5JmBSXJm6J1XKp9unijI5pBaycd2hemOoo5d8hx_Idod-lsqSXF-evNSLR90KZBYZU8KK76DKi0tRpWqacdjoGccOPaLAsEwYXOJ1Wduh3oA29A-7JEgovf7Qu0Aa0cYjHQC_4llAFfYdkqfa5mIwuBhVUvLMBtEhOPympzCrOEgDXlULL7dlhZRNaXjwXyFqrjwTKFKA_kEBJAIL79AXsuVRiJ_-B4CosT4.QSHQq7gQaDPmgr8M4e_1wi8x6g6djSJdPDSnJco4zYI",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "19:05YJBXOCI66190ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 253.6,
                    "currency": "EUR"
                }
            },
            "outboundRef": "19:55BCNMADIB422ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "OPTIMA",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVV1v2zoM_SuDntPBdr6WvDlOehcgX0vcCwxDUSg2k2q1JU-SuwVF__slZTtJ0_YWe0okkYeH5CH9xIyFgg3Zt5tlPBmzFuOPXGR8KzJhD9OUDQe9Tov9VKWWcDBs-OOJpVBwbUsNY24BXQMv6F75_lXQQ_fjIz6MosX5TXwo6DZeh4vNarmO70bhZkIRtRaPPMOneTg-nd82f269T6DtXRCo8P6CQMX4_wnctpgq7VaVEqvzxAqtHkUKOlJyJ_al5lYoSYXrer12i0mwKy0SIFOeo5NlQ7_b-9wPWiwptQaZHDDI5GaNqZF1pPJcGIMgfJvBK1_vs_eWY8NiDTugJ1eWAHNJOB6yzLFaqUwkAuountfOu_K-UOJ1kI-pUhUSJa3miZ2rlDdqQXIaDDKRdixMQiDXnHqx45mBFtvhYV1mjsPtGW2sqJB7QmA-ElESfvNDnbzVJXpm6neijD0i8cShRyptwDTkXD_Uhy03QJFDl8gK9IobA3IP2mVfNCfyx6DhOGYnp_MKdAdvVZxkeIkRff07CGSZcWNjkTwAZT9-2RGf1Ez1GnEjjOO4WM47eHkMTAo9JXDlCGgSptWi2ADXyX1TPvVIPBtpnbUAhS5QCxg_FDoTsgGcjljFL6SFEIv8hVoGn_xg2O6jPmjAatWz4ZcuNiZNBZ14hiNhUR9r-FUKDSnmxzEmW31dLmjs4mk8o9_r6XoT3y3COR1m4en_ZB5OZ-z2HNJ1cS9J6C9BPwBDEPTLUZYf7bBP_mDY7Q4977QIXtsE_jDwKpvXC-9yn-GQSFMobRdlviX9sY4bTVIrvFN4VYB-rymUeUGp1JftoFHKUQu1UOiu3mKrm9FsGr1q1pbv93wPU7lTNHqryK2MrZARtt7UeJNoiYDfSd1KPSCp88fwPMMm2Cx0Hc6pFAj_D4qyOE6uheReioRnG6sK8--SdPjsGpRBYiEdVZwqeVIK1zzHz1Ej2F-lsrQar1-8VConfqFMp8aUsOE5xEQMJejyrcMfp2fOkdMTjjJLhcGJ2ZaVHU42aEP_UCiCVlLQ7gb9nj-g8cLqA34z05AYtj1aBJVNv9PpD9zQXtg832IIg1_QBOau5VTSjZsuuS9dpmxCwoE_haiac7EKaNzax3GTmFh0j76Qrk8r7_k_m66DSA.U9UpajuuafneXEQvr1FlZtg4PVYZ8jVr4rIFZ-rUUho",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "19:55BCNMADIB422ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 322.91,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:10BCNMADIBFAKE-BCNMAD-11112ECONOMY",
            "hasFareFamilyUpSell": false,
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zgM_ZWBnpOBL03S5s25zRqTizdxFxgsikK2mVRbW_JIcmeCIv--pO00adNusU-2xNsheUg9M2OhZEP25-0qnk5Yh_EnLnKeiFzYfZix4U3_qsP-UZWWsDds-Pczy6Dk2lYaJtwCmnqO1-u6btfro_mLEAWj8fL8Jt6XdBuvg-UmWq3j-1GwmVJErcUTz1G0CCan8_vqh87HAHznDYDG3_8A0CD-bwB3HaYqm6hKYnWeWanVk8hAj5Xcil2luRVKUuE879rrMAk20iIFUuUFGlmS-F-9foelldYg0z0Gmd6uMTXSHquiEMagE57kcGHrfHXeM7T8N5jLQO8rHyGvYQskoixnwfdp1_V611eu1x9QJ1OOkjyv84lULlIBbf_Pq-50nWsqWRvx8ySpfqmSVvPULlTGjzxDpBoMwpJ2IkxKTmacurjluYEO2-JhXeU1BmqBhF9832ZsdYUaufqVKmNfLHhaexmr7GikoeD6sT0k3ABFCGrAEeiIGwNyB7qR59zYWKSPYIXcTV7n7LrsVMZNVZa5ILO6iveb2yiah9M1qmhiidWi3ADX6cMRqXoivhz7fJYVsk5geTFgIHQuJBB49BuOWAMooOmMRfGqATdfXG_oD4auT2xvKciGroM15Vkm6MhzJKjFmq_hZyU0ZJgRx6As-mO1pCGIw3hO31m43sT3y2BBh3lw-p8ugnDO7s5d1hXbSWLSa6efOEMnaFdgqz_bKJSZ6wwd5zSW7-j4w16rc7l-3m4XJJ40pdJ2WRXJS9O6qIxydOi6HmoRT-CDPqgS9Ec9ojqUlFh7yRritieM1F60uyW6Hc3D8WXXEr7b8R2EcqtQy3e-fP9WT2Qi5BhpYFp_0_FquVr8QFGi1CMiOhf-OE_2GG8e1M0uqCoY4BsStHwZGAvpgxQpzzdWleavFXHyUPcqh9RCNmpQNVSlLGa8wHfiSN6flbK0s2avJK1vAhjILDSmgg0vICZkSMc651anPA7ggiOo5wOuqkwYHJ-kavRw24I29IekERmxwO95g757Q7OGtQd8zbKAIPoOvRSNzuDqanDjOpc6hzsMYfBtS2FRN5xquqlHTe6qOlU2JRLB71I0DXqzCGj2_Hr2eqgmMbHxA9pCtj6tmsO_7oNgcQ.r7b3nSTufRAnTxa_BnkIRDnbJNbuKhBLNvwgRimSJLE",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:10BCNMADIBFAKE-BCNMAD-11112ECONOMY",
                    "baggageAllowance": "30 KG"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "20:55YJBXOCI66210ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz04hyZfUepNlp9EivtRWFm0XQUFLY4cbmVRJKl0jyL_vjC62nDgN-mSTnMs5M2dGT8xYyJnPvtzO48mYdRh_5CLja5EJu49S5g8HvQ77VxVawt4w_58nlkLOtS00jLkFdPUcr3_huhfeAN0Pj_gwCmftm3if0228DGarxXwZ_xgFqwll1Fo88gyfpsH4eD5v_tx5G0DXeQGgivcHACrEvwdw12GqsGtVSKzOE8u1ehQp6FDJjdgWmluhJBWu7wy6HSbBLrRIgEz5Dp0s83u9j06HJYXWIJM9ppjcLpEY2YZqtxPGYAi-zuCVp3PescGwhA3QE8F2e8gk4XjIshLTQmUiEVD3sF0558L5RLTrJO8BpQokSlrNEztVKW-UgqYaDOKQdixMQiGuOPVhwzMDHbbBw7LISgR3LdBYTSG3FIG5CENJ-MX3NXWrC_TM1K9EGXuIxJMyeqjSJpiGHdcP9WHNDVDmoKSxAL3gxoDcgi65582J_DFpMI7Z0anN3_PO8u-8jhFe_1kIRJlxY2ORPACxH5_2wyUlU71G3AhkxeaLaBYtrqk-h9SkzyOFi4qGJl1aLfIVcJ3cNxVUjwS10VarC6hzgWJACIHQmZBNxIiGmSAGtA9isTuRy_CD6_ndS9_t03zVome-O-hjc9JU0JFnOBIWNbKEn4XQkCJHjknZ4no-o7GLo_iGfq-i5Sr-MQumdLgJjv8n0yC6YXftkGUnt5Kkfhr0nWAYBP12KM33dtgHz_H7fd9xjovgjE3X7zmVTXvffPtrdLJOvs5DPOOgSJMrbWfFbk0aZAOvbDBJFt4ovcpBv9UWop4Tl_oyXq5qudQXLbXQbb3IFrejmyh83bA13275FiK5UTSCi7BcHGshQ-y_qUNOwvlsPv1GKlfqAXG1H-dtlse1Gc0qklpg-M-ozPwwwRaSeykSnq2sys3f87IphxCo-obK1-_ff9OI2PN899OLRpy3GlZWzdaJ27nGYBIcmaomZcrnu-dSMhkkFtJRVaFqYqiiV3yHH8hmhn4WytK6vjp5qQaPqhXINDKmgBXfQZkXh6JMVRfjMNFTjhV6wgXDUmFwiNdFZYf7BrShf1glQYvS6_a9y4E7pIlHOQB-xdOAEHYdWk-VzWWvdzkslfbCBtkhOfymJzAtNUgNXpUDL7dFyZRNqHnwXy4qrbxYULQBuocNIJFYeI--kC6Pi_j5f29BsTg.BNtHuJIMk-ObSvLxdkaN3ooPiWtdX9YnmqIWC661_Ic",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "20:55YJBXOCI66210ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 282.77,
                    "currency": "EUR"
                }
            },
            "outboundRef": "13:30BCNMADIB412ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "OPTIMA",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zAM_ZVBz2nhS9K0fnOcdA2Q2xJ3wDAUg2IzqVZb8iS5W1D030f6kqRpu2JPiSTy8JA8pJ-YsVCwgH25ncejIesw_shFxtciE3Y3TllwddHtsJ-q1BJ2hgXfn1gKBde21DDkFtDVc7zemeueeRfovn_Eh0E0O76JdwXdxstwtlrMl_GPQbgaUUStxSPP8GkaDg_nt82fO-8T8J0TAjXefxCoGf-bwF2HqdKuVSmxOk-s0OpRpKAjJTdiW2puhZJUuJ5z4XeYBLvQIgEy5Tk6WRa4l93zvtdhSak1yGSHQUa3S0yNrCOV58IYBOHrDF75OufOW44tiyVsgJ6qsnQxl4TjIcsqVguViURA08Xj2jlnziUl3gT5mCpVIVHSap7YqUp5qxYkp8EgE2mHwiQEcs2pFxueGeiwDR6WZVZxuDuijRUVcksIzEUiSsJvvmuSt7pEz0z9TpSxeySeVOiRSlswDTnXD81hzQ1Q5LBKZAF6wY0BuQVdZV-0J_LHoOEwZgen4wr0_bcqTjI8xYhu_g8CWWbc2FgkD0DZD192xCU1U70G3AhDIzqczafU031gUughgbOKgCZhWi2KFXCd3LflU4_Es5XWUQtQ6AK1gPFDoTMhW8DxgNX8QloIschfqOXqk-sFfj9wezRgjepZcNnDxqSpoBPPcCQs6mMJv0qhIcX8OMZki5v5jMYuHscT-r0eL1fxj1k4pcMkPPwfTcPxhN0dQ1Zd3EoS-kvQD8AQBP1ylOVHO-yT6we-EzjOYRG8YdMNer3a5vXCO91nOCTSFErbWZmvSX-s63p4T2qFdwqvCtDvNYUyLyiV5tL3WqU0F3uh0F2zxRa3g8k4etWsNd9u-RbGcqNo9BZRtTLWQkbYetPgjaI5An4jdSv1gKSOH78cZ9gGm4RVh3MqBcJ_RlEW-8m1kNxLkfBsZVVhvs5Jh89VgzJILKSDmlMtT0rhmuf4OWoF-6tUllbj9YuXWuXEL5Tp2JgSVjyHmIihBKt8m_D76Zly5PSEo8xSYXBi1mVth5MN2tA_FIqgleT5Pa9_4V7ReGH1Ab-ZaUgMfYcWQW3T73b7V9XQntg832EIg1_QBKZVy6mkq2q65LasMmUjEg78KUTdnJNVQOPm78dNYmLRPfpCujysvOe__VmDcA.hnHXwgl99LhI3MmeR7yfqHJIvtLJjs4uN_H7H5yaypg",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "13:30BCNMADIB412ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 253.6,
                    "currency": "EUR"
                }
            },
            "outboundRef": "18:00BCNMADIB418ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "OPTIMA",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVWtv2zoM_SuDPqeD7byafHOc9C5AXkvcARcXxaDYTKrVljxJ7hYU_e8jZTtJ0_YWAwo0ksjDQ_KQfmLGQsGG7OvtMp6MWYvxRy4yvhWZsIdpyoaDXqfFfqhSSzgYNvzviaVQcG1LDWNuAV0DL-he-f5V0EP34yM-jKLF-U18KOg2XoeLzWq5jr-Pws2EImotHnmGT_NwfDq_bf7cep9A27sgUOH9BYGK8f8TuGsxVdqtKiVW54kVWj2KFHSk5E7sS82tUJIK1_V67RaTYFdaJECmPEcny4Z-t_e5H7RYUmoNMjlgkMntGlMj60jluTAGQfg2g1e-3mfvLceGxRp2QE-uLD7mknA8ZJljtVKZSATUXTyvnXflXVPidZCPqVIVEiWt5omdq5Q3akFyGgwykXYsTEIgN5x6seOZgRbb4WFdZo7D3RltrKiQe0JgxFpJ-MUPdfJWl-iZqV-JMvaIxBOHHqm0AdOQc_1QH7bcAEUOXSIr0CtuDMg9aJd90ZzIH4OG45idnM4r0B28VXGS4SVG9OXvIJBlxo2NRfIAlP34ZUd8UjPVa8SNMI7jYjnv4OUxMCn0lMCVI6BJmFaLYgNcJ_dN-dQj8WykddYCFLpALWD8UOhMyAZwOmIVv5AWQizyF2oZfPKDYbuP-qABq1XPhtddbEyaCjrxDEfCoj7W8LMUGlLMj2NMtvqyXNDYxdN4Rv9vputN_H0RzukwC0-_J_NwOmN355Cui3tJQn8J-gEYgqBfjrL8aId98q-Hnod_p0Xwhs1gGHQrm9cL73Kf4ZBIUyhtF2W-Jf2xjk_TRmqFdwqvCtDvNYUyLyiV-rIdNEo5aqEWCt3VW2x1O5pNo1fN2vL9nu9hKneKRm8VuZWxFTLC1psabxItEfBfUrdSD0jq_DE8z7AJNgtdh3MqBcL_g6IsjpNrIbmXIuHZxqrCfFuSDp9dgzJILKSjilMlT0rhhuf4OWoE-7NUllbjzYuXSuXEL5Tp1JgSNjyHmIihBF2-dfjj9Mw5cnrCUWapMDgx27Kyw8kGbegXCkXQSgra3aDf8wc0Xlh9wG9mGhLDtkeLoLLpdzr9gRvaC5vnOwxh8AuawNy1nEq6cdMl96XLlE1IOPC7EFVzLlYBjVv7OG4SE4vu0RfS9WnlPf8Bom6DTQ.Y2FGMIAVJFi7GSvX49-fl2cSLHsZeCFwzf407ov6320",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "18:00BCNMADIB418ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "17:35YJBXOCI66180ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz85Clm-N3mTZ2WgR26qsLLYogoKWxg43EqmSVLpGkH_fGUm25Vwa9MkmOZdzZs6MnpixUDKPfbldJfMZ6zH-yEXONyIXdh9mzLscD3vsX1VpCXvDvG9PLIOSa1tpmHEL6Oo67uii379wx-h-fMSHabDs3iT7km6T2F-uo1WcfJ_66zll1Fo88hyfFv7sdH7b_Ln3PoCB8wJAE-83ADSIfw3grsdUZTeqklidJ1Zq9Sgy0IGSW7GrNLdCSSrcyBkPekyCjbRIgUx5gU6WecPhH06PpZXWINM9ppjfxkiMbANVFMIYDME3ObzydN52PGCIYQv0RLBHSCTl-D_Pa0iRykUqoG1ht3DOhfOZWLc5PsJJBUiVtJqndqEyfhAKmmowCEPamTAphbji1IYtzw302BYPcZXXCO46mLGYQu4oAusjDCXhJ9-3zK2u0DNXP1Nl7DEST-vogcoOwTQUXD-0hw03QJn9mkYEOuLGgNyBrrmXhxP5Y1J_lrCTU5e_677Jv_c6RnD9eyEQZc6NTUT6AMR-dt6PPgmZ6jXlRiArtorCZRhdU32OqUmeJwoXDQ1NsrRalGvgOr0_VFA9EtSDtDpdQJkLFANC8IXOhTxEDGmWCaJP6yARxZlcLj_1XW8w8foksqzVPMMjcuVZJujIc5wIixqJ4UclNGTIkWNSFl2vljR1SZjc0O9VGK-T70t_QYcb__R_vvDDG3bXDVl3cidJ6edBPwiGQdCvQGl-tMI-9SfeYOQ5zmkPvLZxHc9pbbrr5utf07Nt8s8qwDMOijSl0nZZFRvSIBv3P5MrSRbeKb0qQb_XFqJeEpf2MonXrVzai45a6LbdY9Ht9CYMXjdsw3c7voNQbhWNYBTUi2MjZID9N23IebBarhZfSeVKPSCu7uOqy_K0NcNlQ1ILDP8nKrM8TrCF9F6KlOdrq0rz94rE-Fw3KYfUQjZtMDUaJQ5XvMAv0kG1PyplaT9enb00Uid8vsxCYypY8wISAoYyrAm36Y8ztOCI6QlHmmXC4NhsqsYOJxy0oX8oFkGryR2M3Mm4f0kzhg0A_GxmPiEcOLQQGpvJcDi5rIf3hc3zHaYw-BFNYVF3nUq6rkdM7qqaKZtTueC_UjTdebESaOYGx5mTSCy4R1_I4tPqe_4fExOE0A.l9LoSR_tvEUgGgyGptPEmYT1oOPELMp2DSeoa2ifP6M",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "17:35YJBXOCI66180ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "08:55YJBXOCI66090ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty4jgQ_ZUpPZMtm2vwmzFk460AHnC2ZmYrNSXshmhjJI8kZ5ZK5d-32xcwuUxqnkBS30736eMnZizkzGOfb5fxbMo6jD9ykfGNyIQ9hCnzxsN-h_2rCi3hYJj3zxNLIefaFhqm3AK6dp3u4MJ1L7pDdD8-4sMkWLRv4kNOt_HKX6yj5Sr-PvHXM8qotXjkGT7N_enp_Lb5c-f9AnrOiwKqeL9RQFXxrwu46zBV2I0qJHbnieVaPYoUdKDkVuwKza1Qkho3cIa9DpNgIy0SIFO-RyfLvH7_D6fDkkJrkMkBU8xuVwiMbAO13wtjMATfZPDK03nbsalhBVugJyp7hEASjv-zrCwpUplIBNQjbDfOuXAuCXWd46M6qQGJklbzxM5VyhuioKkGg2VIOxUmoRBXnMaw5ZmBDtviYVVkZQV3rZqxmULuKAJzsQwl4Sc_1MitLtAzUz8TZewxEk_K6IFKm2Aa9lw_1IcNN0CZ_RJGBDrixoDcgS6x582J_DGpP43ZyamNv9t9E3_ndYzg-vdCYJUZNzYWyQMQ-un5PFwiMvVrwo1AVGwZhYswuqb-HFMTPU8QLioYmmhptcjXwHVy33RQPVKpDbVaU0CaCyQDluALnQnZRAxpl6lEn-QgFvszuow_uV2vN_LcAa1XzXnmucMBDidNBR15hhthkSMr-FEIDSli5JiURdfLBW1dHMY39HsVrtbx94U_p8ONf_o_m_vhDbtrhywnuZPE9POgHwTDIOi3R2p-JGGfnEtvMPAc56QDr21c1-s7lU1bbr7-NTlTky_LAM-4KNLkSttFsd8QB9nQGZMrURbeab3KQb83FoKeE5b6Ml6ta7rUFy220G2tY9Ht5CYMXg9sw3c7voNQbhWtYBSUwrERMsD5mzrkLFgulvOvxHKlHrCu9uOyjfKkmuGiAqkFhv8TmZkfN9hCci9FwrO1Vbn5e1kO5RgCWd9A-fLt2y8GEbuO516-GMTbVuPKqlGduJ1rCibBlal6UqZ8vnsuKZNBYiGdVB2qNoY6esX3-H1sduhHoSyp9dXZS7V41C1fpqExBaz5Hsq8uBRlqroZx42ec-zQEwoMS4XBJd4UlR3qDWhD_7BLgoSy2xt0R0N3TBuPdAD8iKc-VdhzSJ4qm1G_PxqXUvLCBtEhOPykJzAvOUgDXpcLL3dFiZTNaHjwXy4qrrwQKFKA3lEBJAIL7tEX0tVJiJ__B717sQ0.StpCWv95w1k-3GTT9WPsd9S8P6fEsg-QktRNUKYz3Dw",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "08:55YJBXOCI66090ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 253.6,
                    "currency": "EUR"
                }
            },
            "outboundRef": "16:55BCNMADIB416ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "OPTIMA",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zAM_ZVBz-lgO7fGb46TbgFyW-IOGIaiUGwm1WpLniR3C4r--0hfkjRtV_QpkUQeHpKH9CMzFnLms2_Xi2g8Yi3GH7hI-Uakwu4nCfMHvU6L_VKFlrA3zP_5yBLIubaFhhG3gK6e43UvXPfC66H74REfhuH89Cba53QbrYL5erlYRbfDYD2miFqLB57i0ywYHc-vmz-13ibQds4IVHgfIFAx_j-BmxZThd2oQmJ1Hlmu1YNIQIdKbsWu0NwKJalwXafXbjEJdqlFDGTKM3SyzHe7vc99r8XiQmuQ8R6DjK9XmBpZhyrLhDEIwjcpvPB1PjuvOTYsVrAFeqrKgrnEHA9pWrJaqlTEAuountbOuXAuKfE6yPtUqQqxklbz2M5Uwhu1IDkNBplIOxImJpArTr3Y8tRAi23xsCrSksPNCW2sqJA7QmAuElES_vB9nbzVBXqm6k-sjD0g8bhED1XSgGnIuL6vDxtugCIHZSJL0EtuDMgd6DL7vDmRPwYNRhE7Op1WoDt4reIkw3OM8OvHIJBlyo2NRHwPlP3oeUdcah_Va8iNMCXH-WLWwctDYFLoMYGLkoAmYVot8jVwHd815VMPxLOR1kkLUOgCtYDxA6FTIRvAyZBV_AJaCJHInqll8Mn1_HYf9UEDVque-ZddbEySCDrxFEfCoj5W8LsQGhLMj2NMtvy6mNPYRZNoSr9Xk9U6up0HMzpMg-P_8SyYTNnNKWTZxZ0koT8HfQcMQdAvQ1m-t8M-uT2_2_Ud57gIXrG59D2nsnm58M73GQ6JNLnSdl5kG9If67i0Kkmt8EbhVQ76raZQ5jmlUl-2vUYpBy3UQqG7eostr4fTSfiiWRu-2_EdTORW0egtw3JlbIQMsfWmxhuHCwT8QepW6h5JnT4Gpxk2waZB2eGMSoHwX1CU-WFyLcR3UsQ8XVuVm-8L0uFT2aAUYgvJsOJUyZNSuOIZfo4awf4ulKXVePXspVI58QtkMjGmgDXPICJiKMEy3zr8YXpmHDk94iizRBicmE1R2eFkgzb0D4UiaCV57a7X77kDGi-sPuA3MwmIYduhRVDZ9Dud_qAc2jObpxsMYfALGsOsbDmVdF1Ol9wVZaZsTMKBv7momnO2Cmjc2odxk5hYeIe-kKyOK-_pH54Wg0w.bOTc_jOWvHwSZvrg_xoNgm9n_YZfdEzR-PVzb9GzAhI",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "16:55BCNMADIB416ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "10:50YJBXOCI66110ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVW1v4jgQ_isrf6anJFC65VsI9JpVIdmQnm51qlYmGaiviZ21ne6iqv_9ZpIAoS9X7SewPS_PM_PM5IkZCxWbsK-3UTqfsQHjj1wUfC0KYXdhziaX49GA_atqLWFn2OSfJ5ZDxbWtNcy4BXT1HO_8zHXPvDG6Hx7xYRos-zfprqLbNPGXqzhK0u9TfzWnjFqLR17g08KfHc9vmz8P3gcwdF4AaOP9BoAW8f8DuBswVdu1qiVW54lVWj2KHHSg5EZsa82tUJIKd-6MhwMmwcZaZECmvEQnyyaj0R_OgGW11iCzHaaY3yZIjGwDVZbCGAzB1wW88nTedtxjSGAD9ESwh0gk4_i_KBpIsSpEJqBrYb9wzpnzmVh3OT7CSQXIlLSaZ3ahcr4XCppqMAhD2pkwGYW44tSGDS8MDNgGD0ldNAjuepixmEJuKQJzEYaS8JPvOuZW1-hZqJ-ZMvYQiWdN9EDl-2AaSq4fusOaG6DMfkMjBh1zY0BuQTfcq_2J_DGpP0vZ0anP3_Pe5D94HSO4_r0QiLLgxqYiewBiPzvth0tCpnpNuRHIikVxuAzja6rPITXJ80jhrKWhSZZWi2oFXGf3-wqqR4K6l1avCyhzgWJACL7QhZD7iCHNMkH0aR2kojyRy-Un15sMLybuOY1Xp3mGR-TK81zQkRc4ERY1ksCPWmjIkSPHpCy-jpY0dWmY3tDvVZis0u9Lf0GHG__4f77wwxt21w_ZdHIrSemnQT8IhkHQr0RpfrTCPrkOTu7EcY574A2b4cTrbPrr5tuX6ck2-TsK8IyDIk2ltF3W5Zo0yMZu02CSLLxTelWBfq8tRL0iLt1lmqw6uXQXPbXQbbfH4tvpTRi8btiab7d8C6HcKBrBOGgWx1rIAPtvupDzIFpGi2-kcqUeEFf_MeqzPG7NcNmS1ALD_4nKrA4TbCG7lyLjxcqqyvwVkRifmyYVkFnIpy2mVqPE4YqX-EXaq_ZHrSztx6uTl1bqhM-XeWhMDSteQkrAUIYN4S79YYYWHDE94UizXBgcm3Xd2uGEgzb0D8UiaDV5w3PvYuxe0oxhAwA_m7lPCIcOLYTW5mI0urhsevvC5vkOUxj8iGawaLpOJV01Iya3dcOUzalc8KsSbXderASaueFh5iQSC-7RF_LkuPqe_wPY64S8.4u5OLzQvUHj2YwAJG5ltS9FtILETFck5ZkXNBubS6C4",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "10:50YJBXOCI66110ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "11:50YJBXOCI66020ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu4zYQ_ZUFn51C8i2N3mTZaVTEtiorxe4WwYKWxg4bmdSSVLZGkH_vjC62nDgb7JNNcm5n5szRMzMWCuaxv-6WyWzKeow_cZHztciF3YcZ867Gwx77V5Vawt4w759nlkHBtS01TLkFdO07_dGF6170x-h-eMSHSbDo3iT7gm6T2F-somWcfJv4qxll1Fo88Ryf5v70eD5v_tJ7v4CB86qAOt4vFFBX_PMC7ntMlXatSondeWaFVk8iAx0ouRHbUnMrlKTGjZzxoMck2EiLFMiU79DJMm84_M3psbTUGmS6xxSzuxiBkW2gdjthDIbg6xzeeDrnHdsaYtgAPVHZVwgk5fg_z6uSIpWLVEAzwm7jnAvnd0Ld5PioTmpAqqTVPLVzlfGWKGiqwWAZ0k6FSSnENacxbHhuoMc2eIjLvKrgvlMzNlPILUVgLpahJPzg-wa51SV65upHqow9ROJpFT1QWRtMw47rx-aw5gYos1_BiEBH3BiQW9AV9qI9kT8m9acJOzp18ff7Z_H33sYIbn4tBFaZc2MTkT4CoZ-ezsMlIlO_JtwIRMWWUbgIoxvqzyE10fMI4aKGoYmWVotiBVynD20H1ROV2lKrMwWkuUAyYAm-0LmQbcSQdplK9EkOErE7ocvVJ7fvDS49d0Tr1XCeee54hMPJMkFHnuNGWORIDN9LoSFDjByTsuhmuaCtS8Lkln6vw3iVfFv4czrc-sf_s7kf3rL7bshqkltJTD8N-kEwDIJ-O6TmRxL2yXVxcz3HOerAGZuhNxjVNl25-fLn5ERNPi8DPOOiSFMobRflbk0cZGOnT65EWXin9aoA_d5YCHpBWJrLJF41dGkuOmyh20bHorvJbRi8Hdiab7d8C6HcKFrBKKiEYy1kgPM3TchZsFws51-I5Uo9Yl3dx2UX5VE1w0UNUgsM_wcyszhssIX0QYqU5yurCvP3shrKIQSyvoXy-evXnwwicQceMvF0EOetBrVVqzpJN9cUTIorU_ekSvly_1JRJofUQjapO1RvDHX0mu_w-9ju0PdSWVLr65OXevGoW77MQmNKWPEdVHlxKapUTTMOGz3n2KFnFBiWCYNLvC5rO9Qb0Ib-YZcECWV_MOpfjl3SeI10APyIZz5VOHBInmqby-Hw8qqSklc2iA7B4Sc9hXnFQRrwqlp4uS0rpGxGw4P_ClFz5ZVAkQIMDgogEVjwgL6QxUchfvkfnw2w_g.4PXkx-fdulR5WS4XmP7-A71lkMReMELHtdexLvyN4-I",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "11:50YJBXOCI66020ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "14:55YJBXOCI66150ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz85Clm-N3mTZ2aiIbVVWFlssgoKWxg43EqmSVFojyL_vjCTbci4b9MkmOZdzZs6MnpixUDKPfb1dJfMZ6zH-yEXONyIXdh9mzLscD3vsX1VpCXvDvH-eWAYl17bSMOMW0NV13NFFv3_hjtH9-IgP02DZvUn2Jd0msb9cR6s4-T7113PKqLV45Dk-LfzZ6fy2-XPvfQAD5wWAJt5vAGgQ_z-Aux5Tld2oSmJ1nlip1aPIQAdKbsWu0twKJalwI2c86DEJNtIiBTLlBTpZ5g2Hfzg9llZag0z3mGJ-GyMxsg1UUQhjMATf5PDK03nb8YAhhi3QE8EeIpGU4_88ryFFKhepgLaF3cI5F85nYt3m-AgnFSBV0mqe2oXK-EEoaKrBIAxpZ8KkFOKKUxu2PDfQY1s8xFVeI7jrYMZiCrmjCKyPMJSEn3zfMre6Qs9c_UyVscdIPK2jByo7BNNQcP3QHjbcAGX2axoR6IgbA3IHuuZeHk7kj0n9WcJOTl3-rvsm_97rGMH174VAlDk3NhHpAxD72Xk_-iRkqteUG4Gs2CoKl2F0TfU5piZ5nihcNDQ0ydJqUa6B6_T-UEH1SFAP0up0AWUuUAwIwRc6F_IQMaRZJog-rYNEFGdyufzUd73BxOuPaLxazTM8IleeZYKOPMeJsKiRGH5UQkOGHDkmZdH1aklTl4TJDf1ehfE6-b70F3S48U__5ws_vGF33ZB1J3eSlH4e9INgGAT9CpTmRyvsU3_ojUae45z2wBs2E89tbbrr5tuX6dk2-XsV4BkHRZpSabusig1pkI2xUPhAkoV3Sq9K0O-1haiXxKW9TOJ1K5f2oqMWum33WHQ7vQmD1w3b8N2O7yCUW0UjGAX14tgIGWD_TRtyHqyWq8U3UrlSD4ir-7jqsjxtzXDZkNQCw_-JyiyPE2whvZci5fnaqtL8tSIxPtdNyiG1kE0bTI1GicMVL_CLdFDtj0pZ2o9XZy-N1AmfL7PQmArWvICEgKEMa8Jt-uMMLThiesKRZpkwODabqrHDCQdt6B-KRdBqcgcjdzLuX9KMYQMAP5uZTwgHDi2ExmYyHE4u6-F9YfN8hykMfkRTWNRdp5Ku6xGTu6pmyuZULvhViqY7L1YCzdzgOHMSiQX36AtZfFp9z_8BGA6E0w.1al3uJeUeFDDoUm6IRCQ4626al7fIb168K8mn4nPs8w",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "14:55YJBXOCI66150ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 349.52,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:20BCNMADIBFAKE-BCNMAD-11114ECONOMY",
            "hasFareFamilyUpSell": false,
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVVtv2zoM_iuDnpPBdtImzZtz24zlNts9wHBQFIrNpFptyZPkbkGR_z7Sdi5t2lOcJ1vi7SP5kXpmxkLBBuz77TKejFmL8ScuMr4WmbC7IGWDm-tui_1UpZawM2zw7zNLoeDalhrG3AKaeo531XbdtneN5kchCoajxflNvCvoNg79RbRahvH90I8mFFFr8cQzFM398en8tvq-9T6AjvMKQO3vfwCoEf83gLsWU6Vdq1JidZ5ZodWTSEGPlNyIbam5FUpS4Tyv77WYBLvSIgFS5TkaWZR0-5_7boslpdYgkx0GmdyGmBppj1SeC2PQCV9ncGHrfHbeMrT8D5jLQG8rHyCHsAESUZZT_9uk7XpX_a7rXfeokwlHSZZV-axUJhIBTf_Pq-60nT6VrIn4cZJUv0RJq3li5yrlB54hUg0GYUk7FiYhJ1NOXdzwzECLbfAQllmFgVog4TffNRlbXaJGpn4nytijBU8qLyOVHow05Fw_Noc1N0AR_ArwCvSKGwNyC7qWZ9zYWCSPYIXcjl_m7LrsVMaoLIpMkFlVxfvodrWaBZMQVTSxxGpRRMB18nBAqp6IL4c-n2WFrBNYXgzoC50JCQQe_QZDVgPyaTpjkb9owM0n1xt0egO3Q2xvKMgGroc15Wkq6MgzJKjFmofwqxQaUsyIY1C2-rpc0BDEQTyj7zQIo_h-4c_pMPNP_5O5H8zY3bnLqmJbSUx66fQDZ-gE7XJs9UcbhTLznIHjnMbyDZ3uUedy_bzeLkg8aQql7aLM18emtVEZ5ejQdbuoRTyBd_qgCtDv9YjqUFBizSWriducMFJz0eyW1e1wFowuu7bm2y3fQiA3CrU6zqdvX6qJXAs5QhqYxt9ktFws5z9QtFbqERGdC3-cJ3uIN_OrZudUFQzwBQlaHAfGQvIgRcKzyKrC_LMkTu6rXmWQWEiHNaqaqpTFlOf4ThzI-6tUlnbW9IWk8U0AfZkGxpQQ8RxiQoZ0rHJudIrDAM45gnre46pKhcHxWZe1Hm5b0Ib-kDQiJRZ0rrzetXtDs4a1B3zNUp8gdhx6KWqdXrfbu3GdS539HYYw-LYlMK8aTjWNqlGT27JKlU2IRPCnEHWDXi0Cmr1ONXtXqCYxsdED2kIanlbN_i9TM2CG.utDcMYoZG2frkq_haaOHi5b7ex8utiLgFgYnS0uMuxQ",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:20BCNMADIBFAKE-BCNMAD-11114ECONOMY",
                    "baggageAllowance": "30 KG"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 325.26,
                    "currency": "EUR"
                },
                "taxes": {
                    "amount": 2.0,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:00BCNMADIBFAKE-BCNMAD-11110ECONOMY",
            "hasFareFamilyUpSell": false,
            "provider": "FakeFlight",
            "fareType": "PUBLIC",
            "fare": "FAK FareName",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVW1vozgQ_isrf05WQJqmzTfytoc2LxzQk1anqjIwSX0Fm7VNd6Mq__1mgDTp21UnRQr2vD0z88z4iRkLFRuzP282yXzGeow_clHwVBTC7oOcja8vL3rsH1VrCXvDxn8_sRwqrm2tYcYtoKnneMO-6_a9SzR_FqJgMl2f3yT7im6TyF_H4SZK7iZ-PKeIWotHXqBo5c9O5_fVD72PAQycVwBaf_8DQIv4vwHc9piqbapqidV5YpVWjyIHPVVyK3a15lYoSYXzvCuvxyTYUIsMSJWXaGRJMvw6dHssq7UGme0xyPwmwtRIe6rKUhiDTnhawBtb56vznqHlv8G8DfS-8hFyBFsgEWW58L_P-643vLpwvcsRdTLjKCmKJp9QFSIT0PX_vOpO37miknURP0-S6pcpaTXP7Erl_MgzRKrBICxpZ8Jk5GTBqYtbXhjosS0eorpoMFALJPzi-y5jq2vUKNSvTBn7bMGzxstU5UcjDSXXD90h5QYogt8ADkGH3BiQO9CtvODGJiJ7ACvkbvYyZ9dlpzLGdVUVgsyaKt7FN2G4DOYRqmhiidWiioHr7P6IVD0SX459PssKWSewvBjQF7oQEgg8-g0mrAXk03QmonzRgOsvrjcejMbugNjeUZCNr7CkPM8FnXiB_LRY8gh-1kJDjglxjMnCPzZrmoEkSJb0vwiiOLlb-ys6LP3T93zlB0t2e-6yKdhOEpFeOv3EGTpBuxI7_dlCocQcB3-nqXxHZzD2Op232-f1ckHeSVMpbdd1mT73rI_KKEeHrkt-iCbwQRtUBfqjFlEdKkqsu2Qtb7sTRuouutUS3kyWwfRN01K-2_EdBHKrUGngfPn-rZnHVMgpksB07ubTzXqz-oGiVKkHBHQu_HGe6zHc0m96XVJRMMA3pGf1PC4WsnspMl7EVlXmrw0x8tC0qoDMQj5pUbVEpSQWvMRX4kjdn7WytLEWLySdbwLoyzwwpoaYl5AQMmRjk3KnUx3Hb8UR1NMBF1UuDA5PWrd6uGtBG_pCzoicSDAYeqNL95omDUsP-JblPkEcOPROtDqji4vRddPVVzqHWwxh8GXLYNX0m2oaN4Mmd3WTKpsTh-B3Jdr-vFoDNHmDZvKGqCYxsek92kIenRbN4V_7WWAZ.0KdveVVABxafq7HZcbtDY5FJ_fcjfdLAccYDgzADdxA",
            "lastTicketingDate": "2025-10-11",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:00BCNMADIBFAKE-BCNMAD-11110ECONOMY",
                    "baggageAllowance": "30 KG"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "07:55YJBXOCI66280ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zgQ_ZWCz85Clm-N3mTZ2WgR26qsLLYogoKWxg43EqmSVLpGkH_fGUm25Vwa9MkmOZdzZs6MnpixUDKPfbldJfMZ6zH-yEXONyIXdh9mzLscD3vsX1VpCXvDvG9PLIOSa1tpmHEL6Oo67uii379wx-h-fMSHabDs3iT7km6T2F-uo1WcfJ_66zll1Fo88hyfFv7sdH7b_Ln3PoCB8wJAE-83ADSIfw3grsdUZTeqklidJ1Zq9Sgy0IGSW7GrNLdCSSrcyBkPekyCjbRIgUx5gU6WecPhH06PpZXWINM9ppjfxkiMbANVFMIYDME3ObzydN52PGCIYQv0VBcFiaQc_-d5DSlSuUgFtC3sFs65cD4T6zbHRzipAKmSVvPULlTGD0JBUw0GYUg7EyalEFec2rDluYEe2-IhrvIawV0HMxZTyB1FYH2EoST85PuWudUVeubqZ6qMPUbiaR09UNkhmIaC64f2sOEGKLNf04hAR9wYkDvQNffycCJ_TOrPEnZy6vJ33Tf5917HCK5_LwSizLmxiUgfgNjPzvvRJyFTvabcCGTFVlG4DKNrqs8xNcnzROGioaFJllaLcg1cp_eHCqpHgnqQVqcLKHOBYkAIvtC5kIeIIc0yQfRpHSSiOJPL5ae-6w0mXn9E49VqnuERufIsE3TkOU6ERY3E8KMSGjLkyDEpi65XS5q6JExu6PcqjNfJ96W_oMONf_o_X_jhDbvrhqw7uZOk9POgHwTDIOhXoDQ_WmGfnIk3GnmOc9oDr236jue2Nt118_Wv6dk2-WcV4BkHRZpSabusig1pkI3dz-RKkoV3Sq9K0O-1haiXxKW9TOJ1K5f2oqMWum33WHQ7vQmD1w3b8N2O7yCUW0UjGAX14tgIGWD_TRtyHqyWq8VXUrlSD4ir-7jqsjxtzXDZkNQCw_-JyiyPE2whvZci5fnaqtL8vSIxPtdNyiG1kE0bTI1GicMVL_CLdFDtj0pZ2o9XZy-N1AmfL7PQmArWvICEgKEMa8Jt-uMMLThiesKRZpkwODabqrHDCQdt6B-KRdBqcgcjdzLuX9KMYQMAP5uZTwgHDi2ExmYyHE4u6-F9YfN8hykMfkRTWNRdp5Ku6xGTu6pmyuZULvivFE13XqwEmrnBceYkEgvu0Rey-LT6nv8HCNeE0A.xeQ2rUv9WLmzSywfrgO3LluPxwJh5nUrlzh9otO6kes",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "07:55YJBXOCI66280ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 253.6,
                    "currency": "EUR"
                }
            },
            "outboundRef": "15:15BCNMADIB414ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "OPTIMA",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtu2zAM_ZVCz-lg57rkzXHSNUBuS9wBw1AUis2kWm3Jk-RuQdF_HynbSZq2K_aUSCIPD8lD-okZCzkbsK83i2g8Yg3GH7lI-Uakwu4nCRv0u-0G-6kKLWFv2ODHE0sg59oWGkbcAro2vWbn0vcvm110PzziwzCcn95E-5xuo1UwXy8Xq-huGKzHFFFr8chTfJoFo-P5bfPnxvsEWt4ZgRLvPwiUjP9N4LbBVGE3qpBYnSeWa_UoEtChkluxKzS3QkkqXMfrthpMgl1qEQOZ8gydLBv4ne6nXrPB4kJrkPEeg4xvVpgaWYcqy4QxCMI3Kbzy9T55bznWLFawBXoi4n4fc4k5HtLUsVqqVMQCqi6e1s679D5T4lWQj6lSFWIlreaxnamE12pBchoMMpF2JExMIFecerHlqYEG2-JhVaSOw-0JbayokDtCYD4SURJ-832VvNUFeqbqd6yMPSDx2KGHKqnBNGRcP1SHDTdAkQOXyBL0khsDcgfaZZ_XJ_LHoMEoYken0wp0-m9VnGR4jhFe_x8Esky5sZGIH4CyH73siE9qpnoNuRHGcZwvZm28PAQmhR4TuHQENAnTapGvgev4vi6feiSetbROWoBCF6gFjB8InQpZA06GrOQX0EKIRPZCLf0Lvzlo9VAfNGCV6tngcwcbkySCTjzFkbCojxX8KoSGBPPjGJMtrxdzGrtoEk3p92qyWkd382BGh2lw_D-eBZMpuz2FdF3cSRL6S9APwBAE_TKU5Uc77MLvYFYDzzsugjdsuoO2V9q8Xnjn-wyHRJpcaTsvsg3pj7V9aiOpFd4pvMpBv9cUyjynVKrLVrNWykELlVDortpiy5vhdBK-ataG73Z8BxO5VTR6y9CtjI2QIbbeVHjjcIGA30ndSj0gqdPH4DTDOtg0cB3OqBQI_wVFmR8m10J8L0XM07VVufm2IB0-uwalEFtIhiWnUp6UwhXP8HNUC_ZXoSytxqsXL6XKiV8gk4kxBax5BhERQwm6fKvwh-mZceT0hKPMEmFwYjZFaYeTDdrQPxSKoJXUbHWava7bpxqrD_jNTAJi2PJoEZQ2vXa713dDe2bzfIshDH5BY5i5llNJ12665K5wmbIxCQf-5KJsztkqoHFrHcZNYmLhPfpCsjquvOe_u1CDTQ.wM23FOLRZsSacOjBLwPD6QSjobaX0iwNDMW5sgEtr_g",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "15:15BCNMADIB414ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 146.58,
                    "currency": "EUR"
                }
            },
            "outboundRef": "11:50BCNMADUX7706ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "LITE",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdtO20AQ_ZVqnwOyHYKbvDlOKJFya2KqogqhjT0JW-xdd3cNjRD_3hlfkhCgiKdkd-dyzsyZ8RMzFnLWY9-vZtFwwFqMP3CR8pVIhd2OEtbrnp-12G9VaAlbw3q_nlgCOde20DDgFtDVc7zOieueeOfovnvEh344PbyJtjndRotgupzPFtFtP1gOKaPW4oGn-DQJBvvz2-bPrfcBtJ0jAFW8TwCoEP8fwE2LqcKuVCGxOk8s1-pBJKBDJddiU2huhZJUuI5z3m4xCXauRQxkyjN0slTSU99rsbjQGmS8xRzDqwUyI-NQZZkwBmPwVQqvXJ1T5y3HBsQC1kBPhNvtIJWY4yFNS1BzlYpYQN3Ew9I5J85X4l0n-RAp1SBW0moe24lKeKMVxKbBIBBpB8LEFOOCUyfWPDXQYms8LIq0hHBzgBrrKeSGIjAXcSgJj3xbc7e6QM9UPcbK2F0kHpfRQ5U0wTRkXN_XhxU3QJmDkscc9JwbA3IDuiSfNyfyx6TBIGJ7p8MCeN23Ck4iPI4RXn4uBKJMubGRiO-B2A9eNsQlLVO9-twIZMWmg-tZZ4yXu8Skzz2BkxKAJllaLfIlcB3fNeVTD4SzUdZBC1DmAqWA-QOhUyGbgFc_WYUvoHUQieyFWLpfXK_X9nulxJJa86gW5MmTRNCJpzgQFvWxgD-F0JAgP4452fxyNqWhi0bRmH4vRotldDsNJnQYB_v_w0kwGrObw5BlFzeSdP4y6AfBMAj6ZSjLjzbYF9fFwe05zn4NvGHT7nm1zet1d7zNcEikyZW20yJbkf6Y7zu0KUmu8E7lVQ76va4Q9Zy41Jf-V7-WSn2xUwrd1UtsftUfj8JX3VrxzYZvYCTXCo2ceViujJWQIfbe1PGG4Ww6m1yTvJW6R1CHj9NDik2ycVC2OKNaYPhvqMp8N7oW4jspYp4urcrNjxkJ8bnsUAqxhaRfYar0SRQueIZfo0axfwplaTVevHipZE74ApmMjClgyTOICBhqsORbp9-Nz4QjpiecZZYIgyOzKio7HG3Qhv6hUgTtJK_d8fxzt0vzhdUH_GQmASFsO7QJKhv_7MzvllN7ZPN8gykMfkBjmJQtp5Iuy_GSm6JkyoZURvibi6o5R7uA5q29mzeJxMI79IVksd95z_8AOFiDxQ.wRb8Hy5aNKTCpMuacpj4MMNxc-yqISGcglvx7nXp9sg",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "11:50BCNMADUX7706ECONOMY",
                    "baggageAllowance": "0 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 136.18,
                    "currency": "EUR"
                }
            },
            "outboundRef": "13:45YJBXOCI66014ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "INICIAL",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVdty2kgQ_ZXUPOOUxM1Bb0LgWFsGFJC3kmy5UoPU4FmLGWVm5Czl8r9vty4gbBxXnmBm-na6Tx89MWMhZx77cruIpxPWYfyRi4yvRSbsPkyZNxr2O-xfVWgJe8O8f55YCjnXttAw4RbQtet0Bxeue9EdovvhER_Gwbx9E-9zuo2X_nwVLZbxj7G_mlJGrcUjz_Bp5k-O5_Pmz523C-g5Lwqo4v1BAVXFvy_grsNUYdeqkNidJ5Zr9ShS0IGSG7EtNLdCSWrcwBn2OkyCjbRIgEz5Dp0s8_r9j06HJYXWIJM9ppjeLhEY2QZqtxPGYAi-zuCVp3PesalhCRugJyrbdRFJwvGQZWVNkcpEIqCeYbtzzoXziWDXSd4rlDqQKGk1T-xMpbxhCppqMFiHtBNhEgpxxWkOG54Z6LANHpZFVlZw1yoauynkliIwqllJ-MX3NXSrC_TM1K9EGXuIxJMyeqDSJpiGHdcP9WHNDVBmv4QRgY64MSC3oEvseXMif0zqT2J2dGrj73bP4u-8jhFc_1kIrDLjxsYieQBCPzmdh0tMpn6NuRGIii2icB5G19SfQ2ri5xHCRQVDEy-tFvkKuE7umw6qRyq14VZrCshzgWTAEnyhMyGbiCEtM5Xokx7EYndCl9EHt-v1Lj13QPtVk5557nCAw0lTQUee4UpY5MgSfhZCQ4oYOSZl0fViTmsXh_EN_V6Fy1X8Y-7P6HDjH_9PZ354w-7aIctJbiVR_TToO8EwCPrtkJrvadgHt-f1B57jHIXgjM3Q6zmVTVtvvv01PpGTr4sAz7go0uRK23mxWxMH2dBx-_hAlIU3Wq9y0G-NhaDnhKW-jJermi71RYstdFsLWXQ7vgmD1wNb8-2WbyGUG0UrGAWlcKyFDHD-pg45DRbzxewbsVypB6yr_bhoozzKZjivQGqB4T8jM_PDBltI7qVIeLayKjd_L8qhHEIg6xsoX79__80gYhcn9enFIM5bjSqrRnXidq4JmARXpupJmfL57rmkTAaJhXRcdajaGOroFd_hB7LZoZ-FsiTXVycv1eJRt3yZhsYUsOI7KPPiUpSp6mYcNnrGsUNPKDAsFQaXeF1Udqg3oA39wy4JEspub9C9HLoj2nikA-BXPPWpwp5D8lTZXPb7l6NSSl7YIDoEh9_0BGYlB2nAq3Lh5bYokbIpDQ_-y0XFlRcCRQrQOyiARGDBPfpCujwK8fP_awOxOw.5hyRZvnwNAMSCri7jZkqZ7aE09ja6cxqGcUyBiRRxXI",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "13:45YJBXOCI66014ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        },
        {
            "priceBreakdown": {
                "totalPrice": {
                    "amount": 282.77,
                    "currency": "EUR"
                }
            },
            "outboundRef": "12:30BCNMADIB410ECONOMY",
            "hasFareFamilyUpSell": true,
            "provider": "Amadeus",
            "fareType": "PUBLIC",
            "fare": "OPTIMA",
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyVVW1v2jAQ_iuTP9MpEChtvoVANyTeBumkaaoqkxzUa2JnttMNVf3vu3MSoLRd1U9g--655-6euzwyY6FgAft2PY9HQ9Zi_IGLjK9FJuxunLLg8rzbYr9UqSXsDAt-PrIUCq5tqWHILaBrx-v0ztrts845uu8f8WEQzY5v4l1Bt_EynK0W82V8OwhXI4qotXjgGT5Nw-Hh_Lr5U-ttAr53QqDC-wCBivH_Cdy0mCrtWpUSq_PICq0eRAo6UnIjtqXmVihJhet5536LSbALLRIgU56jk2VB-6L7ud9psaTUGmSywyCj6yWmRtaRynNhDILwdQYvfL3P3muODYslbICeXFl8zCXheMgyx2qhMpEIqLt4XDvvzLugxOsg71OlKiRKWs0TO1Upb9SC5DQYZCLtUJiEQK449WLDMwMttsHDsswch5sj2lhRIbeEwNpIREn4w3d18laX6JmpP4kydo_EE4ceqbQB05BzfV8f1twARQ5dIgvQC24MyC1ol33RnMgfg4bDmB2cjivQ91-rOMnwFCP6-jEIZJlxY2OR3ANlP3zekTapmeo14EYYGtHhbD7t4uU-MCn0kMCZI6BJmFaLYgVcJ3dN-dQD8WykddQCFLpALWD8UOhMyAZwPGAVv5AWQizyZ2q5_NTuBH4_aPdowGrVs-Cih41JU0EnnuFIWNTHEn6XQkOK-XGMyRZf5zMau3gcT-j3arxcxbezcEqHSXj4P5qG4wm7OYZ0XdxKEvpz0HfAEAT9cpTlezvMJeYFnndYBK_Y-EGvV9m8XHin-wyHRJpCaTsr8zXpj3Vdb0mt8EbhVQH6raZQ5gWlUl_6nUYp9cVeKHRXb7HF9WAyjl40a823W76FsdwoGr1F5FbGWsgIW29qvFE0R8AfpG6l7pHU8eO34wybYJPQdTinUiD8FxRlsZ9cC8mdFAnPVlYV5vucdPjkGpRBYiEdVJwqeVIKVzzHz1Ej2N-lsrQar569VConfqFMx8aUsOI5xEQMJejyrcPvp2fKkdMjjjJLhcGJWZeVHU42aEP_UCgidZu01-mfty9pvLD6gN_MNCSGvkeLoLLpd7v9S9fYE5unGwxh8AuawNS1nEq6ctMlt6XLlI1IOPC3EFVzTlYBjZu_HzeJiUV36Avp8rDynv4B7XuDaw.kmrIzHgVr7tY6Jbzog_w3yClu3qyJxwyWiAF9_BOJSQ",
            "lastTicketingDate": "2025-10-10",
            "lowcost": false,
            "segmentsBaggageAllowance": [
                {
                    "segmentRef": "12:30BCNMADIB410ECONOMY",
                    "baggageAllowance": "1 PC"
                }
            ]
        }
    ]
}
```

This operation returns fare families of the selected recommendation but before this call you should check if this recommendation has property **hasFareFamilyUpSell** as true. This means:

\- List of different fare with prices.

\- Each one with amenities included.

```
{"recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJyFVW1P2zAQ_ivIn9spTSmUfgt92ar1JUvCtGlCyHWO4pHYwXZgFep_312alEJBSJVa2_fyPHfPXZ-ZdVCwAftxtUzGI9Zi_JHLjK9kJt1mmrJBt99psb-6NAo2lg3-PLMUCm5caWDEHaCr7_m9dqfT7nrovn_Eh3kwOrxJNgXdJlGwiMNllNxcBvGYMhojH3mGT1-jXy_n98231y2mS7fSpUJwz6ww-lGmYIZa3cp1abiTWhFu3-_7LabAhUYKIFOeo5Njg4vOl95Zi4nSGFBigznGVxHbVsZDnefSWozBVxkcuXpfvPccHf8H9sjYf9-4QRzBLdATkWwYtX3kLzheZlnFJNSZFBLqwh_W22t7HSpWnexTelQ4oZUzXLi5TnnTX8RowCIg5UbSCoox4dS-W55ZaLFbPERlVkGg2it44puaqzMlWmT6SWjr9h5cVFGGOm2cDOTc3NeHFbdAGYIKbwgm5NaCWoPZvWfcukSKe3BSrUdvKJ-ylwLGZVFkktzYJPg-vomvwnA2HUdoYqiYzsgiBm7E3R6afiSlNC0-oIV6k1hezBhIk0kFhB4DTy_ZDlFAY5HI_BUa_8TrD7wefkjntfjYoONhUXmaSjryDKXpsOgRPJTSQIqUOCZl4bflguQ_ngfTGX5PplGc3CyCOV0m02RG37Ogubs-DFmVbK1IRK-Dfh4E_XLs9WejfNLxkcfA814G8h2b7qBX2xzP_duxRuUpW2jjFmW-2netjY8YDeOR9Ekm8EEXdAHmow5RFQqiVV-ynW7rE-apL-qdEl5dzqbD454J3HtqiO22ted4uFws57_RcqX1PeY-fPx9SKqJPAuqpubEnq_hKyqx2MvPgbhTUvAsdrqwP5ekvW3VkwyEg_SSr9fotJMk4Z3wHBdxI9KHUjtaS5NXL7shJHyBSqfWlhDzHBIChqqryNXpi2bQ5hwxPW9xGaXS4pisyp0drlMwln6hNiQuB9btXvid87M-zRQWGfDfIg0IYdfbtvY2Pe-0f35xbLO9xhQW_zsEzKvOUknjaqLUuqyYsvGC-vevkLtOvB14HLGL_YgpJDa8Q19Io5eVsv0PH3syJQ.Z9DSu1B0hnD8UZ5h485rM_2qARz6pmqUupbYrihNXHU"}
```

**Quote Fare Family - Response**

```
{
    "fareFamilies": [
        {
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztWWlv2zgQ_SuGPruBDsvXN8XHxoCvtZRFmyIoaIlxuJVFlZTSDYr8953R4SOW66tZbFABARJKw5nhzHsk9fJDkRENlbby5-3E6XWVqkKeCPPJnPkseh54SrtVr1WVv3ksAvoslfbnH4pHQyKiWNAuiShM1VXd_KBpH_Q6TF-9hBfXnfHmE-c5xKfOzBrb08nM-XJt2T2MKAR7Ij68Glnd9bjY_KW6PwFDfZVA6u-EBNKMf57AfVXhcTTncQDV-aGEgj8xj4oODx7YIhYkYjzAwplq3agqAY2mgrkUTckSJkVKW2sYV7V6VXFjIWjgPkOQ3u0MlobWHb5cMinBCZn7dGeueqUWTcyzmNEHiq8wcc2EtbgEBr6fZDXlPnMZzbq4WTv1g9rEhWdBDqeKVXB5EAniRiPukRwtkJygEjIJoi6TLjrpE-zFA_ElrSoPMJjFfpLD_UbaUFEWLNCDokEiPKDfyXO2-Gyqz7-7XEarMXET9x3u5d4EXRLxNRvMiaQY2kpWMqViSqSkwYKKZPlhPsL5ENXqOsp60mYJao2ikiMOX_vo3JzmArL0iYwc5n6luPzudks0hLNAnEWChTYlwn1crZ4_YdgcKhslBeAy6C24s5jwWUCz5G4_Kmk4CwnusOVW91sVTW8bzbaRcDhDMZAf0iaex3BEfIB4BP2e0W8xE9SDdAnEVKY3kzHSyBk4Q_zdH8xs58vYGuFgaK3_7o2swVC533SZNGURIHC3nR5wBk5g3hJgdmhPqmgaULGtqmtiF9gYbT2z2d3AXu9PAPpAhlxE43g5RzgpjYaKdUP00T2V5yEV-7qCSw9xLdnDRrOhpFTJHoy7nz6Zw-xZti1Nb6-Hg85Ot-ZksSALOggeOBip006yB8xZ0IHey8xfrzMZT0afEK2cf4WkNl-ON5eYBxtaSYuXWAtw_wfAMlxhMaLuY8Bc4tsRD-VfEwTiS9Ihn7oR9a7TnFJ84hL6ZAnnS7YRuWlY27HGXWuGBQ7I8vWTgl1Ur5ln76JavV68j0Y8AlDm5kvmCi5ZtB3XNK_qraLJaY-5OMb6BcsjniCQtEPqsgeoH3ZR4uQEsgA-wNvtxwRcGwfNzhZfsId8RmxXNRV-7iGSZrY1FZyBy8SfsdefcYS_lzX3jkx9D8q2saodwuorQvTwMlC8tIJ4dxfFu8viQUAWuH7sUS_BLsML0gqwWuWGBF4lhzseEWjQMFcWfSZkVHEfKVTXq8xzw3s0zXjQH_Y-rjmQjwrwbzTPx7-hno__mqpdmfqx-N9nXeL_UvybN_8t_jHeG-E_M9RqK8POI4GLlaxYPlz7IFhuUl-fDpREFTs5YfDwW_lYBwMYcwH30so1J8KDemwT7frWTk6YNdngyWDcs-3KgZOn3tDPZp7ZMs5mXkNVr2rNY5m3z_p3Z95khwl6MRNyOGxTYXLy0dO9LGD3bc-e3LCxwRu4ArNdkwu5lxnpzZXREIC6oBXLBSjKHXJuH4Qrbv7kRGyp539XN_Xa2bxs1bQr7Vha7jEuWXk5K086EH8FK9_8RDyClW9_aB5B3I2PvX7-ffeMhc_oPBw4vTWX89EvlsZa5zNYa6onfNPts_7dObx7pz2oP-yKHBfdaU-Jd5fFO43BWPpvMSAKENjfkjIyMQTztAJvIGVMbfDhoJRCUr7lNivhcERCWFuawntQlI13qSjrpaL8v1GUm-Y7V5QNtZLsTz9TlNGm3jbMXUV56z9cSq4wFyrKxi9VlFuFm98hRRm7dbmifFcqyqWi_A4UtVJRLhXl3xn_paJcKsqlolwqyqWiXCrKJStLRblUlEtF-f92py0V5WMVZY_JSLB5nNpBJ6mQ-FeWkKIbpt6oaygMCfotphKoZqGmYqg5QRW9Uas1WqlsuG2TpC15LFw6SkQqLIqd4CJYxIk2o_SwffSfkKVy0isxEhVCY6UQYnHS3cabrUXXl38BdgHPag.aXOZm7HjDT2u_0dYLRL4p8IvKANwFdl_fZM89XK7Mfg",
            "fareFamily": {
                "name": "LITE",
                "priceBreakdown": {
                    "totalPrice": {
                        "amount": 180.69,
                        "currency": "EUR"
                    }
                },
                "amenities": [
                    "1 Hand Baggage"
                ]
            }
        },
        {
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztWW1v4jgQ_ison2mVF0KAbynQKxJvB-lpt6tqZRKX-jbEWTvpXlX1v99MXngNLZT2tHsbqVJxMp4ZzzyPbR6eFBnRUGkpf16PnG5HqSrkgTCfzJjPoseep7Sa9VpV-ZvHIqCPUml9eVI8GhIRxYJ2SERhqq7q5pmmnel1mL58CS8u2sP1J85jiE-diT2cjkcT5-uFPe1iRCHYA_Hh1cDurMbF5s_V_QkY6lYCqb8jEkgzfjmB26rC42jG4wCq86SEgj8wj4o2D-7YPBYkYjzAwplq3agqAY3GgrkUTckCJkVKS7OM81q9qrixEDRwHyFI93oCS0PrNl8smJTghMx8ujNXPVeLJuZZTOgdxVeYuGbCWlwCA99Pshpzn7mMZl1cr516pjZw4VmQVTi9ZhamilVweRAJ4kYD7pEcLZCcoBIyCaIOky46uSTYizviS1pV7mAwif0kh9u1tKGiLJijB0WDRHhAf5DHbPHZVJ__cLmMlmPiJu7b3Mu9Cbog4ls2mBFJMbSdrGRMxZhISYM5Fcnyw3yE8yGq3XGU1aT1EtSsopIjDrd9tK-OcwFZ-kRGDnO_UVx-Z7MlGsJZIM4iwcIpJcK9X66eP2DYHCprJQXgMugtuLOZ8FlAs-SuPylpOBsJ7rDFRvebFU1vGY2WYSFhMhQD-SFt4nkMR8QHiEfQ7wn9HjNBPUiXQExlfDUaIo2cntPH_5e9ydT5OrQHOOjbq8_dgd3rK7frLpOmzAME7qbTV5yBE5i3AJi9tidVNA2o2FLVFbELbIyWntnsbmDb-xOAPpAhF9EwXswQToplqbj3IfronsrzkIp9XcGlh7iW7KHVwC4gVbIHw87nz91u9izblsbXF_1ee6dbMzKfkzntBXccuTRuJ3vAjAVt6L3M_HXbo-Fo8BnRyvk3SGr95XB9iXmwvp20eIG1APd_ACzDJRYj6t4HzCX-NOKh_GuEQHxOOuRTN6LeRZpTik9cwiVZwPmSbURuGrbfczBCQBbro3fePZu14u0z4hFgMbdeMFdwyaLNsA31vN4smpy2lotDrJ-xKuIBAslpSF12B2XD5kmcnCAVMAcwu_6UYGrtfNnZ2Qu2ji8I6aqmwt8tRNLMlqaCM3CZ-DP2-jMO8Pe8otyBqe8B1yZE1dcgusUDs6_sW1pBvJuT4t1k8SAgC1w_9qiXQJbhvWiJVa1yRQKvkqP8-RbPhgzVl_3upxWq81EBqo1G8UF7CKoNtf5mWNdU7dzUD4X1PusS1kfvvNuwvjoN1sfEu8niHQframpgmSs4MyGjintPobpeZbZlqNWWhu17AtckWbF9uMRBsNykvrSA201UmSbnBR5lSx-rYABjLuCWWbngRHhQj02iXVxPp4497KzIBk96w-50Wkme25POHubVLf3NzDObxpuZZ6nqea1xKPP2Wf_uzBvtMEEvZkIOh00qjNKb1RHU65wWsJMF_FjuWdYab-BCy3ZNTuReZqQ3Vlc2AOqcVmwXoCh3yLl5EC65-cKJ2FTffs9r6G-_6DVr2rl2KC33GJesPJ2VRx2I78HKDz8RD2Dlxx-aBxB37avbZf5t7RELn9F5_UDNMnn5iN2nIh1CZa3-9sutbppHfGfbZ_27k_n0y-1xJ-zpl9sPPGCxR99jgB5g9XJDysjEEFyQHXg9KWM6BVcOSikkZWhusxQOBySEIqS5nqIon0KwYxRl45dUlPVSUf5pFOWG-YsryoZaSTaylxRltKm3DHNXUd74hUvJFeZCRdl4V0W5WbhLvqYoY7dOV5RvSkW5VJRLRblUlEtFuVSUS0W5VJR_auaVinKpKJeK8v-RlaWiXCrKpaL8E5C5VJT_A0XZYzISbBandtByKiR-yjJXdMPUrbqGwpCg32MqgZw2aiqGmiev6FatZjVT2XDTJklb8li4dJCIVFi9aQKgYB4n2ozSxT7Tf0KWyklbYiQqhMZSIcQapfuTN1mJrs__Ag1pz4E.Xx5udtMLth2ABs5ocOpRuW6jy0CtHB8j8XtsBCYCkf4",
            "fareFamily": {
                "name": "STANDARD",
                "priceBreakdown": {
                    "totalPrice": {
                        "amount": 255.69,
                        "currency": "EUR"
                    }
                },
                "amenities": [
                    "1 Hand Baggage",
                    "First checked baggage"
                ]
            }
        },
        {
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztWW1v2kgQ_ivIn2nkF4yBbw4vFyTeDpxTmyqqFntD9mq87q6dXlTlv9-MX8AE00Boe6nOUqSw69mZ2ZnnWS8P3xQZ0VDpKH9eT51-T6kr5IEwnyyZz6LHoad02s1GXfmbxyKgj1LpfPymeDQkIooF7ZGIwlJd1c13mvZOb8LyzUN4cNmdFGecxxBnnbk9Wcymc-fTpb3oY0Qh2APx4dHY7m3H5eZP9cMJGOqzBFJ_JySQZvz9BG7rCo-jJY8DqM43JRT8gXlUdHlwx1axIBHjARbOVJtGXQloNBPMpWhK1rAoUjqaZVw0mnXFjYWggfsIQfrXc9gaWnf5es2kBCdk6dO9teqFWrYwz2JO7yg-wsQ1E_biEhj4fpLVjPvMZTTrYrF26ju1hRvPgmzDGS2zNFWsgsuDSBA3GnOP5GiB5ASVkEkQ9Zh00cmAYC_uiC9pXbmDwTz2kxxuC2lDRVmwQg-KBonwgH4lj9nms6U-_-pyGW3GxE3cd7mXexN0TcTnbLAkkmJoO9nJjIoZkZIGKyqS7Yf5CNdDVLvnKNtFxRI0rLKSIw6f--heneYCsvSJjBzmfqa4_d5uSzSEs0CcRYKFC0qEe7_ZPX_AsDlUCiUF4DLoLbizmfBZQLPkrt8raTgbCe6w9U732zVNh2Z3DAsJk6EYyA9pE89jOCI-QDyCfs_pl5gJ6kG6BGIqs6vpBGnkDJ0R_h8M5wvn08Qe42Bkbz_3x_ZwpNwWXSZNWQUI3F2nLzgDJ7BuDTB76UyqaRpQsaOqW2KX2BgdPbPZP8Cen08A-kCGXESTeL1EOCmWpeLZh-ijByrPQyoOdQW3HuJeskmrhV1AqmQTk96HD-ZVNpcdS7Pry9Gwu9etJVmtyIoOgzuOXJp1kzNgyYIu9F5m_vrd6WQ6_oBo5fwzJFV8OCluMQ82spMWr7EW4P4PgGW4wWJE3fuAucRfRDyUf00RiE9Jh3zqRtS7THNK8YlbGJA1vF-yg8hNw46GDkYIyLo4-sGnZ7tRfnxGPAIs5tZr5gouWbQbtqVeNNtli9PWcnGM9RNWRTxAILkIqcvuoGzYPImLE6QC5gBm1-8TTBXeL3sne8nR8REhXddU-LuFSJrZ0VRwBi4Tf8ZBf8YR_p62lDsy9QPg2oWo-hJEn_NgpBzaWkm8m7Pi3WTxICALXD_2qJdAluG9aINVrXZFAq-Wo_zpFt8NGaoXjj3p2fPeFtnFmRJ0643yF-4x6NaazVfDWzfNE-B9yLqC98kn8DN49_vnwfuUeDdZvNPgXU8NLHNjMWBCRjX3nkJ1vdqyjAeX14sE-FsewMxw0l8sai8QomnpryaE2TZeTQhLVS8arWMJccj6_06I6R5A9XKA5nDYRej0ZEb0zgvY-7mUyA2tjeFMwH2T7Zs0ty8MSqLaIrlK4S0vN9DMgg_GBXwBq11yIjwoyMZIb21vVADUFa3ZLkBR7pFzMOq_L-FmPl3Cy7b6-mtYS3_9Pazd0C60Y2l5wLhi5fmsvPrVrLx6A6zUGhuT7j0BPsma7fv8K-Tz64hb-GY1yL9MPWLhMzrvcvk7FD4k7hxDYUN9_V2zoWoXpn4shw9Z_99JfP5d0zyJw-ffNc2fTuGfz08Ew5cYMA6kGOxIGZkYgpWzA28oZUwX4MZBKYWkIXKbjXA4JiFUOy3KOYryOUw-RVE2fktFWa8U5TejKLfM31xRNtRacmJ-T1FGm2bHMPcV5Z1fuJRcYS5VlI0fqii3S4_jlxRl7Nb5ivJNpShXinKlKFeKcqUoV4pypShXivJ_rV1VinKlKFeK8ltjZaUoV4pypSj_1nfNSlF-O4qyx2Qk2DJO7QBbVEj8lJVI0Q1Tt5oaCkOCfompBPbbqKkYap64oluNhtVOZcNdmyRtyWPh0nEiUmGbFglSg1WcaDNKHwFF_wlZKic9EyNRITQ2CiHWJy2wN9-Krk__AtRqz3Y.8x6bu9Vzewm7AthHdw7u_Nx9rfBBJVI_LLq6XJaXh1I",
            "fareFamily": {
                "name": "FLEX",
                "priceBreakdown": {
                    "totalPrice": {
                        "amount": 401.52,
                        "currency": "EUR"
                    }
                },
                "amenities": [
                    "1 Hand Baggage",
                    "First checked baggage",
                    "Changes Allowed",
                    "Seat Selection",
                    "Priority Boarding"
                ]
            }
        },
        {
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztWWlv2zgQ_SsGP7uBDsuy_U3xsTHg2F7bWfRAUNAS43AriyoppQ2K_Ped0eErcuMj2W2xAgIklIYzw5n3KPLlB1ERC0mL_HkzmnU7pEroA-U-nXOfR499j7Sa9VqV_C1iGbBHRVqffhCPhVRGsWQdGjGYamiG9U7X3xl1mL56CS8u28PNJ7PHEJ_OJs5wOh5NZp8vnWkXI0rJH6gPr66dznpcbP5U3Z-Aqe0kkPo7IoE0458ncFslIo7mIg6gOj9IKMUD95hsi-COL2JJIy4CLJyl1c0qCVg0ltxlaEqXMCkiLd02L2r1KnFjKVngPkKQ7s0ElobWbbFccqXACZ377Nlc7UIrmphnMWF3DF9h4roFa3EpDHw_yWosfO5ylnVxs3baO62BC8-CrMPVbaMwVayCK4JIUje6Fh7N0QLJSaYgkyDqcOWikx7FXtxRX7EquYPBJPaTHG430oaK8mCBHogOiYiAfaOP2eKzqb745goVrcbUTdy3hZd7k2xJ5ZdsMKeKYWgnWcmYyTFVigULJpPlh_kI50NUpzMj60mbJajZRSVHHO76aF8d5wKy9KmKZtz9wnD5ne2W6AhniTiLJA-njEr3frV68YBhc6hslBSAy6G34M7h0ucBy5K7eU_ScA4SfMaXW91vVnSjZTZapo2EyVAM5Ie0qedxHFEfIB5Bvyfsa8wl8yBdCjHJ-Go0RBrN-rMB_u71J9PZ56FzjYOBs_67e-30B-R202XSlEWAwN12-oIzcALzlgCzl_akiq4DFVuatiZ2gY3ZMjKb5xvY7v4EoA9UKGQ0jJdzhBOxbQ33PkQf21N5ETK5ryu49BDXkj20G9gFpEr2YNT58KHbzZ5l29L45nLQbz_r1pwuFnTB-sGdwCWO28keMOdBG3qvMn-XN9P-sDudIlyF-AJZbb4dba4xjzZwkh4vsRjg_w_AZbgCY8Tc-4C71J9GIlR_jRCJT0mLfOZGzLtMk0oBimvo0SV8YLKdyE3DDvozjBDQ5ebolbfPZq14_4xEBGDMrZfclULxaDtsQ7uoN4smp70V8hDrJ6yKfIBAahoyl99B2bB7CicnUAXQAc5u3ieg2vjAPNvaC_aOT4jpqq7Bzy1E0q2WroEzcJn4M_f6Mw_w97Tm3IGpF4BrSHYxqhVjtNseDUfXH7aJMAQiWAOyb2kF8T6eFe9jFg8C8sD1Y495CWQ5HoxWWNUrVzTwKjnKn27x45Chejpzhh1n0lkje_NJAbqNmnUyuvV6_WR4G5Z1BLz3WZfw3oWbfiS8u93z4H1MvI9ZvOPgXU0NbGtl0eNSRRX3nkF1vcq8iAe9Qff9mgP5qAD_ZuN0_Jva6fivafqFZRyK_33WJf7Pxb919e_iH-O9Ef4zQ722MmzfU7gvqIrjw20GguUm9fXXgdGoMk3OTXimW_lYBwMYCwnXrcqloNKDemwTDc5221zLD3uVn5CuqZ1-pGoYp5-pmjX9Qj-Uc3uM_--UGz2jwMun_t27xVGc65wXsJMFfFvS2fYGYeBKx_8LXmZGRmN9rQEoL1jFcQGtCom7cUvq5RejRyz8ms7JgbGAzy8cJPdJN4dw2mqaJ3Pa1rSLWuNQUu-zLll9PquPOkm-Bqvf7ih5OKvfnrJV8jUGGgBveltSRiaGYG2dwOsrFbMpuJihlELTHHKblXJ4TUPoR1q1cyTlc8h-jKRs_paSslFKyr-MpNywfnNJ2dQqyZ76M0kZbeot03ouKW_9i4vkEnOhpGy-qqTcLNyvX5KUsVuvIClvyealpFxKyqWkXErKpaRcSsqlpFxKyqWkXErKpaT8K1GulJRLSbmUlEtWl5Lyby0pe1xFks_j1A7gx6TCv7IaEsO0DLuuozIk2deYKdgxHNRUTC1Pmhh2rWY3U91w2yZJW4lYuuw6UamQZ9MEzMEiTrQZ0sXDG_se8lRP2lEjUSI0VxIh1ibdNL3JWnV9-gd3c9AJ.hHfAKYAvZpYTlspNoFjECIdKpK1wwX_bwCIL83zT5po",
            "fareFamily": {
                "name": "BUSINESS STANDARD",
                "priceBreakdown": {
                    "totalPrice": {
                        "amount": 700.48,
                        "currency": "EUR"
                    }
                },
                "amenities": [
                    "1 Hand Baggage",
                    "First checked baggage",
                    "Prepaid baggage",
                    "Seat Selection",
                    "Priority Boarding",
                    "Lounge Access"
                ]
            }
        },
        {
            "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztWWlv2zgQ_SsGP7uBDsvXN8XHxoCvtZVFDwQFLTEOt7KoUlK6QZH_vjM6LB9y4yNZtFsBARJKw5nhzHuk-PKdBCHzSZv8eTuxel1SJfSRcpcuuMvDp4FD2q16rUr-FpH02FNA2p--E4f5VIaRZF0aMpiqKZrxTlXfaXWYvn4JL647480n1pOPT62ZOZ5PJzPr87U572FEKfkjdeHVyOzm42Lz5-rhBHRlJ4HE3wkJJBn_OIG7KhFRuBCRB9X5TnwpHrnDZEd493wZSRpy4WHhDKWuV4nHwqnkNkNTuoJJIWmrDf2qVq8SO5KSefYTBOndzmBpaN0RqxUPAnBCFy7bm6tcKUUTsyxm7J7hK0xcNWAtNoWB68ZZTYXLbc7SLm7WTnmnNHHhaZA8XEspThWrYAsvlNQOR8KhGVogOckCyMQLuzyw0UmfYi_uqRuwKrmHwSxy4xzuNtKGinJviR6ICokIj32jT-ni06mu-GaLIFyPqR277wgn8ybZisov6WBBA4ahzXglUyanNAiYt2QyXr6fjXA-RDW7FsknbZag1igqOeJw10fn5jQXkKVLg9Di9heGy-9ut0RFOEvEWSi5P2dU2g_r1YtHDJtBZaOkAFwOvQV3Jpcu91ia3O17koQzkeAWX211v1VRtbbebOsNJEyKYmw_1NlxOI6oCxAPod8z9jXikjmQLoWYZHozGSONrIE1xN_9wWxufR6bIxwMzfzv3sgcDMndpsu4KUsPgbvt9AVn4ATmrQBmL-1JFVUFKrYVJSd2gY3e1lKb_Q1sd38C0HuBL2Q4jlYLhBNpNBTc-xB97EDlhc_koa7g0n1cS_qw0cQuIFXSB5Puhw-9m_RZui1Nb6-Hg85etxZ0uaRLNvDuBS5x2on3gAX3OtD7IPV3fTsfjHvzOcJViC-Q1ebbyeYas2hDM-7xCosB_v8AXPprMIbMfvC4Td15KPzgrwki8TlukcvskDnXSVIJQHENfbqCAybdiewk7HBgYQSPrjZHr7x9tmrF-2coQgBjZr3ithQBD7fDNpWreqtoctJbIY-xfsaqyEcIFMx9ZvN7KBt2L8DJMVQBdICz2_cxqDYOmL2tvWDv-ISYrqoK_NxBJNVoqwo4A5exP_2gP_0If885545MvQBcY7KLUaUYo73OZDwZfdgmwhiIYAzJoaUVxPt4UbyPaTwIyD3bjRzmxJDl-GG0xqpauaGeU8lQ_nyHh0OK6rlljrvmrJsje_NJAbq1mnE2utV6_Wx4a4ZxArwPWZfw3oWbeiK8e73L4H1KvI9pvNPgXU0MGsbaos9lEFbsBwbVdSqLIh70h733OQeyUQH-9eb5-NeV8_FfU9QrQzsW_4esS_xfin_j5r_FP8Z7I_ynhmptbdh5oHBfCCqmC7cZCJaZ1PPTgdGwMo-_m_Cbbu0jDwYwFhKuW5VrQaUD9dgmGnzbxSdMTrbsa6_ywslTb2hnM89o6Wczr6EoV7Xmscw7ZP27M2-yx4SXP_53rxgnHT3dywJ23_bsyQwbG7yBmx3fN7mQe6mR1syvLgDUJauYNkAxQHJu3IT62eXnCauaU3b7eFwz9gfn5CFl5hi2NrXzr0GtmnqlHkvWA8YlVy_n6knH5Gtw9c3PySO4-vZH6RF0rpKvEfAEiNXfkjJSMQTLb3rOIAgiNgcXFkopNMkhs1krhyPqQ8uSwl4iKV-yG5wiKeu_pKSslZLyTyMpN41fXFLWlUq87f5IUkabels39iXlrX9xkUxiLpSU9VeVlFuFW_pLkjJ26xUk5S3ZvJSUS0m5lJRLSbmUlEtJuZSUS0m5lJRLSbmUlH9C5pWScikpl5Ly78PVUlL-f0nKDg9CyRdRYgcIZTLAv9IyE003tEZdRWVIsq8RC2A3MVFT0ZUsaaI1arVGK9ENt23itAMRSZuNYpUKqTiP8e4to1ibIT38eGP_-DzRk3bUSJQI9bVEiLVJOuDMctX1-V-Gq9AG.exJ1a0ORLL4ReNK-gez4h4JArMhHmWDAfV6A2EpZa5w",
            "fareFamily": {
                "name": "BUSINESS FLEX",
                "priceBreakdown": {
                    "totalPrice": {
                        "amount": 941.1,
                        "currency": "EUR"
                    }
                },
                "amenities": [
                    "1 Hand Baggage",
                    "First checked baggage",
                    "Prepaid baggage",
                    "Changes Allowed",
                    "Seat Selection",
                    "Priority Boarding",
                    "Lounge Access"
                ]
            }
        }
    ],
    "auditData": {
        "timestamp": "2025-10-09 12:38:37",
        "processTime": 1262,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE3NjAwMjA0OTMsImp0aSI6IkM3QURENDgwLTgxNUItNEQ5Ri1CQUMwLTI2OTUxNjU4MTkxMCJ9.PolK7LrGQy5Zb766hssYACLX3_OES_cLucGXoU7NuuF617m3SDq4Oe9ndKOaDeSegHYyRql2ECR1VDFMXnhyHw",
        "traceId": "C7ADD480-815B-4D9F-BAC0-269516581910",
        "availabilityId": 964,
        "server": "http://localhost:30000"
    }
}
```

This operation returns the rate confirmation of the selected recommendation. This means:

\- Confirmation of cancellation policies

\- Extra baggage possible options

\- Max name length. If exceed, on the book step, names will be cutted. On the response information on this cut will be retrieved.

\- Fare rules (if provider provides it)

\- Returns the required passenger fields for that transport.

```
{
    "transports": {
        "recommendationKey" : "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNrsV9tu00AQ_ZVqn1Nkx7Hb-s11AlRq0pCmiIIQ2tiTsNTZNbvrQlT135lZOxeStICgiAfesuu5nDkzc2LfMWOhZDF7dXUx7nVZi_FbLgo-EYWwi7OcxZ0warFPqtISFobF7-5YDiXXttLQ5RbQte21g0MvOmxH6L56iA-G_bPNm_GipNvxKBlcDi9G4w-nyWWPMmotbnmBj_pJd33eb37fehhA4G0BqOP9AoAa8eMA3reYquxEVRLZuWOlVrciB50qORWzSnMrlCTiQi8KWkyCHWqRAZnyOTpZFnvPvBbLKq1BZgvM0LsaYV1kmqr5XBiDEfikgJ91XEIYwRToEaH2sY6M4--icIiGqhCZgKaDm7yFh94xFd3kWGfzw-DZUbSbkBjIlLSaZ7avcr6cFMSmwSAQabvCZBTkOac-THlhoMWmeBhVhcPwfgM1sinkjCIwaqCS8IUvmtob10J9yZSxqzPPXPhU5ctoGuZc3zSHCTdAqRNXyRD0kBsDcgbalV8uT-SPWZPumK2dNino-PsYpxncjpG-_LUQiLLgxo5FdgNUfvf7lvjEBBF2yo3AqtjbbnDdOcfLVWIaz3UBhw6Apqm0WpSXwHX2ccWXuiWgy9naaAKOucBpQACJ0IWQy4hXb1gNMCE5GIv5d_NycuB3UBhizy1cM_MsPg6xM3ku6MQLXAiLEzKCz5XQkGOBvM65NnFtmUma3G0jvJ_jIP1IcQ7afux7NZBmbffYtONgCXZHnrbVB8damlJpO6jmExoYFnknpGw0X_AAU6oE_RCLVFpJtTSXR8HLprfNxaq1dNeIzvDq9PwsdSM1m_EZnMmpov0Ypm6vJ0Km2B3TROilF4OL_jWZK3WDMDYfvt0sahn-PBn06pq0wPAvcHDKZlruHfsFZBby0zo7tQR1RsjfUb2H5OS_8DWo_wvffuG7_ueFz4_-tvIF3oF3FHvhY8pHNscrm933orXyvT5P9ypfB5f5aZXv-p9SvtbjhB_H4Q8JP0EF3CW8Jnj7PXMf4U6SnozwARIePh3hgz_2V5MLg9s8qer9QtUBbegXroRwL4o4mX7YDmn1sWrAr5g8Ie_Aoy46m5Mw8MIo8nZt7imFwW-aDPqOairs0i2-nFUOBetRMfC1FPWSb8kUKUG4UgLJ55B-RF_IR2s5vv8GAAD__w.qXBAy8uYWgT80w_nJauJaEyxyUGKtWDEAVNbYmroEx4"
    }
}
```

**Confirm - Response**

```
{
    "auditData": {
        "timestamp": "2025-10-09 12:39:44",
        "processTime": 3883,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE3NjAwMjA0OTMsImp0aSI6IkM3QURENDgwLTgxNUItNEQ5Ri1CQUMwLTI2OTUxNjU4MTkxMCJ9.PolK7LrGQy5Zb766hssYACLX3_OES_cLucGXoU7NuuF617m3SDq4Oe9ndKOaDeSegHYyRql2ECR1VDFMXnhyHw",
        "traceId": "C7ADD480-815B-4D9F-BAC0-269516581910",
        "availabilityId": 964,
        "server": "http://localhost:30000"
    },
    "requiredField": {
        "contactPerson": [
            "PHONE",
            "TITLE",
            "FIRST_NAME",
            "LAST_NAME",
            "EMAIL"
        ],
        "otherPersons": [
            "TITLE",
            "FIRST_NAME",
            "LAST_NAME"
        ]
    },
    "priceBreakdown": {
        "totalPrice": {
            "amount": 941.1,
            "currency": "EUR"
        }
    },
    "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztPGtz27ayf4WjT_d2LOrl9zeIhCw2EsnyYVs5zXQUWUl1jyO5kpxzMp3897u7AEiCpPxU2rSFp3UsElgs9r0LaH9vbLbzu8Z5wwn8gReNuds4aEw_Txe30_eL28X2i3fTOD87Pjxo_N_qfr2cf9k0zv_1e-Nmfjddb-_Xc3e6ncPsbrt71Ox0mt1jmJ69hBd9xy8-Sb7c4dMkYn4cBlHyS5_FHFdcrxefp7fwaszc_HP98K8HuxHotUsICHjPQEBg_DAC7w4aq_vt-9X9Eqjze-Nuvfq8uJmvndXyw-Lj_Xq6XayWSLij9nHvoLGcb8P1YjbHodNPMGnbOG_b7YPG7H69ni9nX2AFnkawLxzqrD59Wmw2AGH6_nb-1IkKhWj-YY6vEOvOEWxkNoUPt7eEUri6XcwWc8nCIuHazfYp7louki931u7Zh8fVFZEEs9Vyu57OtuPVzVSJCiC3nm8Ak-XWXWxmCGQwRUZ8mN5u5geND_Ahur-VOMwAh4-rNUKN0hG3WBiOPIclXiCkZjNbL-4Qcxpgl8f8vEyvrX4aez6PY2sw4tfWgEU8_nmpj7IsCx4z-sOykiGPuRhIwyby-ZWXDD3fikMGv5nvWg7zWTSxvHgEn2KbhjkjBksFAyvm0aXn8F0wrUEQ5aiJWXKKAJRMQk6AMtnKkbUkpIvgkkc-d63-BFbwYosIAGhZfW6lMbxIAsuBnSUKj8DnzSs2aUVB6rvNJPLCluNFzoiLv4OQ-80f2VUL8LoAUPRZTsXHbpD21WP4bP0YpLD-hPbusJA5XjKxRt7YE8jGYidDxCmKPB5Z8ZCNRmIEPffTcR8ewzZDoAD3L3gUy8EuTQ6Q1BPEG_jnXQwTiyUP7h4ZE6fOkGaLgVcerOkHieVzB6jNIg_oDxRil8wbMdoQrAJjxAqSkzp6MRARIA09Z1izoTF7Iyisg7QuvEvuK8QJDVjW5QmPxl6GuZgpAcYwIk6sH1P3Ysz95OclWbOCHsBEb5yOrThhk4oOjH17jCIK7xCoj2RL_RGKWAALRVceSGEccscbEIErwNk1Av-lHvi1De9fDjxmMNYChoCoOSQelSXiyNZH_bwcRMG4BWK8S-0AFcQm8Zw3HDg0ToF6QGQvjlMgMHABTABNG7MJCQG8jIORa3mkS8Af_jblI9aK0jj21D_W_3AGgFD9gNlpxEbx_7aSNHoDTPGAAn4LJ7PBxZDJz28m0cXkLf3ZB3AAppWwH7038i17y94Ms4khk8_Tt30u_2RvedRn3o8IIBh5l4CEQjvwSWBxpkSd7JXVbdE_PfFPR6NDvltJCpC1MGG2xa8T7sdAftodDSdCsJHnovqCIuHEEGU0SbhrVznJ3EvmO_yXMI2cofCPOh9ZaMsxyMlW8gaW6PPkioM2gMOljYEflbyDIWD5hMXAjcGDn1IvApzRSKJ-xdxJAtAN_OzykEXAClCxAc7mDFUSrBep7dUQlqgAhDU5Go4RcbVruWyCigbgiKg5SEEPMH6VpfJ1lIzhTCcYhyPQZ1d5hw7CBsEAFa9Hg7AE2E39dXmnSKEcmcKK9JMvy4QdjdkYkR9L5yF-gI3cahYewE69wYBHHBnjBCmIEr_2CLTgDVm2KNamjJBkOSouOBOBXTKyoqAPohLxMYve2NoshDQO4iTX90su5oYRRyMZ18iVsvC5b66aiMHIHoySkv8myR8KB0vEAdvkJ5kxyNwm-RGg9DgQPKU5wWgUXMHWcvzR44DZEOjU4OkMvZELVARyxkBGP6lg6bg2DcpGAE2RxYE7mfAhOXfpnBSbrAuwRGBnhBdzAy7UUAUgZG4c3BoYHOC7gN6FkBamghJGF9zqtNuotg5uXW0O1igwRrAR5Dr2LnyWkBg6QzlAUau4jO4Y0fCQpNGAKBEeSoAG88LcFDjTOUUKg5niUSbqqV_F_egR3AviVNrF41vZIf4QGAEeHMwgKoCIQgK_5Ok1XIuzBdrKi0M-FHvFPXr-gAHyEFcBnC7ZA4gAMG7YtcsC8Bpe7dyl5xdHPZ1rGugCB2tZ9yghte0mV4E14SzCCCkg3wNW0wcq0MPiTCAwA0II20vb5mBLpLTm1jVEI1olPuk36pGYmICTUDFoxocOTK_hRZAmNexQ3CgsVa85fzo3yjYogW2jELopOozdlihxbH3oi2I34Bmgphaxqg7ftdkFbK5g7qyHJUgDGD8cbgD1CMt8fAWBwLVLQx7DoGbtptUPW5HTcp3WoNMadFsRb0VjnPTDDz_oBlp4jRhfPDlG3Y3KuHVRwJwUSBr-ShCdBCHmPTWxc2BnL5-Mkg8j1KQHeUBZKIQOVfka2Opd3IqSi12OTnlpNVYPMpUZ1h24oBE960OE-wYSu2jAwHSrKEmHgbvkYMZdNzPc5QmPLPiw1ZPZEaoSZJIUDWHIZXkDKTd9LxOdOknD0JriFli-07XAJEWx_cQFYA81YDQj0j2sAZnTm9xdImoCuPMILCLFliwEm-RiMMVVVpRPVySKuBNEdYIRUw4A1rQqkKmdvYxfZHWkvQUPAbzjaB2r4sdtyC6KQwrhYBB5F54PKkvxKu6Zy2RIQs7MtQ_cpv0Tw53hRdyyogHMUuErvkLTLT2WWszqB9c1RAk5rJp4vKqlIbezl7mWimxOrwkVVi4qkIOxy2iU1VcEu6Q_zRIWxURtdEH6cSXxDmzcAPyknYESuUsFkqQYZYd-U0yiQgcQxYEcEP1mLUQQAP-C56hicI1SnaEo3peQk5xqYbIAiSltwM6nQDDQkk4-N5tkMuWyDyoyWr1hcFUyH0QTiQwj1qttZD8ybtBGkiYS-kLZGNU2WnlmrX4QJoyK0fIEFBJkNS9R7SsvRfDR26iaIa6hG6yWCyGQoxEHfwTqz5r7GM0KbC6U6oZBHHoJapg7BoZRVQGFhyXDUtSX7zVARMZYgxtzCrpDTMspok6AeBStaSYMVI550QjUQttk85k_GsyCNCeZkSR5Rt74IpYQ3Nrbol5SyR5A7PygScJIlQuW06k4c8hkNuheelTWzUkCf7MkL3GiMYNdaHsNqD4pbLnIsIGZWSlzQqWJfhC8Ia-o7bbP0UOosikWK5kof-bcRNSE3uvuKNcgBKv0RaAuqV-oXei8Ge-P0VITKACSGoWRsCeLMqQasnRT1VhVE9ufBORKpHSxDw4KkVG2BSkyBCaB9S_OHHCahVZDUVLX5nhvSDK5AsUZVLNpCbFpyZChhcKCguEELq_arD3yjnxA5qVVFU8reFkof7RuyeAUymvgVBM0-uAH0dZC9ho7Qw5Jli6yxTLgWDBJqItQA0n3vW0vAwCohuDpBUUz2aywxS47ecRQZr_CepCGe1EsTkg0zmQ1MS_WVBEWw6wGdLtcYyQGNBExGIpBCWCXRhHCEJUrEGY-GIAHkbG0Rkqs9BVUHU9nZOylG5jHN5U5WuRLoE0uiKGokXtlGhQ2DiZA31uMSTYmR0LfpHt8NlGGHmRQ8ACc4ON0weKnF6RxuaAKBrJK4lIwrgF9iMK6474CO88hv8MRkLLqpR3LsSuxY51YwVNEyA-q6h6rhKKW6qh55Ew1Y6ZbLgL9YqHU6I8xyd7oH--JAcMHOeDa5ZC7yIAqOXT__DxxLIdVO8ixNxNXUWAy4T6_EiJAMULfreMy_ymFHQBbpG5C5OHn-ZxAd38ez5-Usxo2plQbMGxlqdKoeAIvxIlSuYmFeRzGbjo56WDE87X6Z2mZ7PAh87r7dC9Nb5AFQDuSAKs1cFo1PKPAhIK_EsLyRB2L29U4qzBEg9lpUsQqaBoyj8ovdKBWmrfTZ6lQsjiguxNqDdL1kItxc90SvWaJHGJzhVgtTsfVAwtNYDB2i7PgTbyQ4VstUvG3lgAVbKQ-ZCStMH0Z_5_Bfbv-OFAjUhb5aIopk2vpYWTFv4i_pi5duxg-6_CVqqpgv-wXCiTJkjTi8l4DPuTH2Lum2NIRFYG0qQvOyEkxThWCDMFtVh9TSYwueWWTrld8UPT2nUvRGZm4XcSuuVijgFssVFEP1YDmEewV_JunlXr4NR7HiSMdAkbZbEkzRvwCVKdsorVtTX5qTaKMcVne6eVnObkRKefHeSkSeU-n4iqTRuO8RwGQBMTdIilgS4KM5C30RBGsBQynUzTpTMRNI3Wxi2rskP1fsYlG54hd8pGufhSs5Of-xbN-uULmjEtaIQ_ZxXUmWksMRTq3MnwykdUJVTPZi0VZVodVp4-U3uXeH4KEVzKhcoSfZ97VIq0T2PJ93xtB_k9LF_bDXLcpTBYYs5RKaJQsuy6Ytzivoo-9mHTR5xgUhFFw6cUit7Ow2n4RQEjX7dHOuI8gm1wlKfnnYpGgeEZjycIoF6eLmc4UKgIW1pjoVFU_3LEsgYxbCFW1VUSsn8gysbjpll6DreqPvHgoxC8rDAuRw_tK5I4T2C-IrOKX1HAW50uyfnDJqwuKoMJX8pwVwlM_L4W3asrjTe2QCX9KaIN40ZndldvutOBXF3_18Nch_jpqXV3BC7Uf-NDFJz38dYi_jiivZBHokBo06EesG4IgKvkVFXz1Gi_zQExJq1bmehAmppGbz4VPQcibbjCGPUnK4RVLvHIptyS8Kp4L9hXl5MmyBWo4sOg-pzg_77PYk7Oa4DeBFmNLXeeEJCO_wUngd0hDVk6ggTGny4hW4EB6FEvrKKyI138rr6kNFQXVKzx3w1ejkLXKz-LQKT-TsxPHy94M0ioE9awIAZ7J2WTEChBgZmW0elYYl69dGR2OvWyD5Wew-V3ao4R5hxiXZbxWmmvkOFeP1whXLi37Ea8CvKdal4w-2ZWOqsJmGvmg3tbra2ad_li1FZep90jaIsBn03a_sveXZEn1-nS9S67ednZtfSy4Wsx4cW26bU6CS5ULGS1SXMbiLAWx5D0liCEz9yySKxkwibRfhWaJx0Z2EbQQGQlVLIuBPwgMwBaxE0JTqQsrZ_YkBsJP5xegtNWq5JEVrAo1Lh37MhhBno1VqOxE9wXH1-oI_VJe9CvWECnOxfHiphRx-aHiZDPLD1UQ-SbJzmxkMMSjBC_AKInIzhQKwZgkNN6BiTzXBZL25WwgmjiswTvknp_wSKiZqq1JOfQDlZapiBXroPUHNrnOyiCtEAp2zsqH2cWitTgk4LLMV67tCYcN-78CCRRVyCxgzgMvvEhVuvWqHYeh2BUzEcjcxebwOAhY1KkUeLOhkHvnx0aSa1m9LjtukbzNZvVsoq2ovKPx6aetfkSIoOBn4w5tEXw66js0cgBleJncyDSvULWVk4TZsFFXLjFi3g0km5kDy2bpxsc6sqmSiUTHQ9ByxRIEMeWibqnqgtlUuhAv_z62iS_Zl1e0U42CmErmZPNObDwOtkgMQIg5i1O6Mo-lyLxQCsiJQnWejmu6VCx8FGxu82lSlwRuIf98lZy9QHi6TxSe3ncoPIf7EZ6jB4RAmTrJ_-qVnlr-F0r28oyMtkHnFnJfF35AN8Igu0Ssgc3yO3SQFjvAb-4IUKV7Uk21OVnHsdiYCuxEiMLYOPuKxF48gHQw2l0feUUJhzcpvKBCPXnRsaj_icnCCAPtJK8k5V4q6CVzKp9qllMcBe2UfZ00D5wbGd_4B_hGY7NearNe4vCOv43D--4M3iu1-m9n716SNsAmC3dM1WhZi8QjZ_3qpzxfysicz0PL9YjZKp_c7UegapKzPAMT7KwmrZeRXRn0ojRNyou6eYVfyISB-C3S3d5YlCfU1VMxI_8qZ8lCgpjpd7DkVSs8GKN7JOqISRx-gOEP5d3EzKPYdEqC12jVhWqSv5ozbk1HmTO05cFQJO-4yRM5dURY_P7hQXZ0KXeXH1_WH04qYmTuSjA2H1u8vGwXaK0opmhO1-TFtQef0xeppLIU7imiM8PzPlsUi4LssLeZq5R6E7IJGhubbkrRbHWzGnVYVnrQ3ytbkd-x0N1r2e6DOrWySh75NKlnPEgFyaPUug6vrevg2uIpfLR4CP_B_2lo9a_lHfrcAio1FHfNC2fLjwrfzpnSHpTMjaRD2eg8QQi_vfzsSzL-BP6pSKLEgp1uzVYzaLValteZjTK3aLbh2J_NsV2qVh8TG1V7FeOUnxZpWu6mJRPsncx92AXmPqtC28fpWrTET6MJxTrvCk2KVvfbxfIj9gtqdCDIWS3n_5l-ka2OZKOg29V_ZqvNNvs8nVEzIWd1Q72D3mGfoU_T9b_lh_fTzRwbDTHqWxTO1-F0s5kvP87X1GjoTn3C-fR9VvyqmZpUbHh0eFLXYAkjtTIMZ_g8EIDl7XSzTRazf89x-67egKmDnavW2FJqCwFfPJ-uZ79mu199xmVVYyjVQAkgfp7eLm6mCI4t1reL5Vwil143xHIMe3kli09ar6czq9M9752e904wxJQNq7DZE9D55maBn6a3zmq5nc620fy3-8V6fgPoTmHNRjgEVYFpiZeM8F9S7198NsYP2ExC_Y05yKjxrgiSmPJxiW2qdKCPAAMgMO_TfLl9rP2Y1emcH7XP2-28h1fNmN55V46p9iortyLbrqfLzd1qvfXvP71HcWqcnLSxzRlK33wH5Vd38_UuruDW73Av8uHJKXIBG2PJB-K7tfKZ7EAm8v4Kt95PP36cfpx7yw8r3GLoUMev94ulA7zfSHgqGUBxXa3-DVgV3wbFParV8FBMbHG9APgXIJd3mTBu57Nfl4vZ9Dberu42lwFK4ldi0e18tp3f9AVSQkBxD4Ppp8Wt6js2E8uOvARXWE4_FT_VdErrnNR3IHtKs7Szw_puadvVFoRRjf60mK1Xm8VWX_a0bR-f1U0WvF2tnzL6K1Jl_RkW2sR389niA5ANubfBySSqIHQgZ-k1CVWhl1ylkVuN7fgXyvRBpw3_vYOVOkfnnTYAA5AEr7cTXu8J8L7mOvdE1GuEy2-UZbRdL6PcCfxgPNEVwQdFOBo1dm2tZr23r1rvrVwPFlwsZ7f3N_MbEtkF9kDMZLVjDafLG0tJ-dd3lMYLCNjpyWWRm0t28UmNdHcPj14s3Z3j4xeLd_fo6BnivWu0Ee-yuHWeKd6cv068n7PeW7ne88T7QAw4OcpGDBbrzdaa_ToH6t5Y7-v0AHsx5jqgPtXIf-_05fLfa79c_g_bHfuo-1T53zXayP9r5f9o-MfKP673jeRfDuwcZgOdX6eQL2wsdgvZDCymhhzn3mE-3VoxxU0Y02Uw8sVAjFfrxfaL1V9N1zdAD13RILYjD5MrW1b6fcTzHJ90X6x5R2e9F2veSbttH54-VfN2jf6na15Q0YTHg_9yivEs1-O-bkH32_oeNfCkoDeQ2S2qQ16pe3JQ9zRPXUBQP84tNgNR3KByFjKhgUp-viBVc5XV3aPWwXiHtu7qw_wUbT3tvjwNOjvs2J2nKuuOwUZXX6-rz3KT-9DVb-4nn6Cr396VPkGdDxq_3YOegGINtFKGLIYg-dnyxtts7ucxgEiwlDIVOKgxWeVwPL0DlgnCvqZ7_GuswXMayPdMA3nTQN40kDcN5E0DedNA3jSQNw3kTQN5-vk2DeSf1AT-9Ogv2wO-gnpBIP42LeD3sUnTAd50gDcd4E0H-O-6A7xrOsBXJM10gDcd4E0HeNMB3nSANx3gTQd40wHedIB_GBHTAV5ji-kAbzrAmw7wpgO85p9NB_g9oGk6wFd4ZjrA04_pAG86wJsO8BqXTQf41xLQdIA3HeBNB3jTAd50gDcd4E0HeHWl42_Qbtx0gP_uWGI6wNOypgO86XJrOsCbDvD4YzrAfwfCYzrAmw7w8qnpAP9X9Y3GZpkO8KYDvOkAbzrAmw7wpgO86QBv2lKbDvD_eI6ZDvCmA_weO8B3TQf476YD_OnRX7wDfK9tUZe0hzrA45jj895RtQO86Pied4AXHeFrO8D39toB_qy2A9tjHeCRW3voAK91uTcd4E0HeNMB3nSANx3gTQd40wHedIA3HeBNB3jTAf471DzTAd50gDcd4P85umo6wP-9OsDfLDbb9eL9vRgHEjpfb_AvSeZGt3fUPTnuYGVoPf_tfr4Ba8KwptJrK6Qb3ZPDw5MzUTfUxxDam9X9ejYfU5UKVTEmeV9-vKfaTINj8Db_791C1JNK1UgsEfbOe2fnh4fSUAkO3ER51fXr_wP_6T3m.3jc-lmMqV1ohO9kbxzjgJfu5hFwXFTCEoB0uQcKVhaE",
    "maxPersonNameLength": 50,
    "services": [
        {
            "provider": "Amadeus",
            "journeys": [
                {
                    "ref": "11:50BCNMADUX7706BUSINESS",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureTime": "2025-11-26 11:50:00",
                    "arrivalTime": "2025-11-26 13:20:00",
                    "duration": 90,
                    "fareRules": [
                        {
                            "category": "RULE APPLICATION",
                            "description": "RU.RULE APPLICATION\nUX BUSINESS FLEX FARES\n APPLICATION\n   AREA\n     THESE FARES APPLY\n     WITHIN SPAIN AND CANARY ISLANDS.\n   CLASS OF SERVICE\n     THESE FARES APPLY FOR BUSINESS CLASS SERVICE.\n   TYPES OF TRANSPORTATION\n     FARES GOVERNED BY THIS RULE CAN BE USED TO CREATE\n     ONE-WAY/ROUND-TRIP/CIRCLE-TRIP/OPEN-JAW/SINGLE OPEN-\n     JAW/DOUBLE OPEN-JAW JOURNEYS.\n CAPACITY LIMITATIONS\n   THE CARRIER SHALL LIMIT THE NUMBER OF PASSENGERS CARRIED\n   ON ANY ONE FLIGHT AT FARES GOVERNED BY THIS RULE AND SUCH\n   FARES WILL NOT NECESSARILY BE AVAILABLE ON ALL FLIGHTS.\n   THE NUMBER OF SEATS WHICH THE CARRIER SHALL MAKE\n   AVAILABLE ON A GIVEN FLIGHT WILL BE DETERMINED BY THE\n   CARRIERS BEST JUDGMENT\n"
                        },
                        {
                            "category": "MINIMUM STAY",
                            "description": "MN.MIN STAY\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "MAXIMUM_STAY",
                            "description": "MX.MAX STAY\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "SALES RESTRICTIONS",
                            "description": "SR.SALES RESTRICT\nFROM/TO SPAIN AND CANARY ISLANDS\n \n  TICKETS MUST BE ISSUED ON UX  AND MAY NOT BE SOLD IN\n  VENEZUELA/RUSSIA/RUSSIA (EAST OF THE URALS)/TURKMENISTAN/\n  AFGHANISTAN/KYRGYZSTAN/BELARUS/TAJIKISTAN/KAZAKHSTAN/\n  PAKISTAN/UZBEKISTAN/AZERBAIJAN/BOLIVIA AND MAY ONLY BE\n  SOLD IN AREA 2/AREA 3/AREA 1\n  TICKETS MAY NOT BE ISSUED BY PTA. EXTENSION OF TICKET\n  VALIDITY IS NOT PERMITTED.\n"
                        },
                        {
                            "category": "ADVANCE_PURCHASE",
                            "description": "AP.ADVANCE RES/TKT\nBETWEEN MAD AND BCN\n \n  RESERVATIONS ARE REQUIRED FOR ALL SECTORS FOR DEPARTURE OF\n  EACH TRIP.\n  WHEN RESERVATIONS ARE MADE AT LEAST 2 DAYS BEFORE\n  DEPARTURE TICKETING FOR DEPARTURE OF EACH TRIP MUST BE\n  COMPLETED WITHIN 1 DAY AFTER RESERVATIONS ARE MADE.\n  OR - RESERVATIONS FOR ALL SECTORS AND TICKETING MUST BE\n       COMPLETED AT THE SAME TIME.\n         NOTE -\n           DIFFERENCE COULD EXIST BETWEEN THE CRS\n           LAST TICKETING DATE AND TTL ROBOT REMARK.\n           THE MOST RESTRICTIVE DATE PREVAILS.\n"
                        },
                        {
                            "category": "FLIGHT APPLICATIONS",
                            "description": "FL.FLT APPLICATION\n \n  THE FARE COMPONENT MUST BE ON\n      ONE OR MORE OF THE FOLLOWING\n        ANY UX FLIGHT.\n"
                        },
                        {
                            "category": "CHILDREN DISCOUNT",
                            "description": "CD.CHILD DISCOUNTS\nFOR ODYYEH TYPE FARES   NOTE - GENERAL RULE DOES NOT APPLY\n \n  ACCOMPANIED CHILD 2-11 - CHARGE 100 PERCENT OF THE FARE.\n        TICKET DESIGNATOR - CH.\n    MUST BE ACCOMPANIED ON ALL FLIGHTS IN SAME COMPARTMENT\n      BY ADULT 18 OR OLDER\n  OR - UNACCOMPANIED CHILD 5-11 - CHARGE 100 PERCENT OF THE\n         FARE.\n             TICKET DESIGNATOR - CH.\n         NOTE -\n          AN ACCEPTANCE LIMIT ON THE NUMBER OF UNACCOMPANIED\n          CHILD WILL BE CONSIDER\n  OR - INFANT UNDER 2 WITH A SEAT - CHARGE 100 PERCENT OF\n         THE FARE.\n             TICKET DESIGNATOR - IN.\n         MUST BE ACCOMPANIED ON ALL FLIGHTS IN SAME\n           COMPARTMENT BY ADULT 18 OR OLDER.\n         NOTE -\n          AN INFANT UNDER TWO YEARS WHO MAY TURN 2 YEARS\n          OF AGE BEFORE THE END OF THE TRIP MUST PAY A\n          CHILD FARE FOR THE ENTIRE JOURNEY\n  OR - 1ST INFANT UNDER 2 WITHOUT A SEAT - CHARGE 10 PERCENT\n         OF THE FARE.\n             TICKET DESIGNATOR - IN.\n         MUST BE ACCOMPANIED ON ALL FLIGHTS IN SAME\n           COMPARTMENT BY ADULT 18 OR OLDER.\n"
                        },
                        {
                            "category": "TOUR CONDUCTOR DISCOUNT",
                            "description": "TC.TOUR CONDUCTOR\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "AGENT DISCOUNT ",
                            "description": "AD.AGTS DISCOUNTS\n \n         NOTE -\n          AGENT DISCOUNTS PERMITTED.\n"
                        },
                        {
                            "category": "ALL OTHER DISCOUNTS",
                            "description": "OD.OTHER DISCOUNTS\n \n         NOTE -\n          DISCOUNTS PERMITTED- BP/RC/DC/F1/F2/RE/RM\n  *** GENERAL RULE FOLLOWS ***\nFROM/TO SPAIN AND CANARY ISLANDS\n \n         NOTE -\n          DM/GR DISCOUNTS MAY APPLY\n"
                        },
                        {
                            "category": "STOPOVERS",
                            "description": "SO.STOPOVERS\nFROM/TO SPAIN AND CANARY ISLANDS\n \n  NO STOPOVERS PERMITTED.\n"
                        },
                        {
                            "category": "TRANSFER",
                            "description": "TF.TRANSFERS/RTGS\nFOR ODYYEH TYPE FARES\n \n  TRANSFERS NOT PERMITTED ON THE FARE COMPONENT\n    FARE BREAK SURFACE SECTORS NOT PERMITTED AND EMBEDDED\n     SURFACE SECTORS PERMITTED ON THE FARE COMPONENT.\n         NOTE -\n          MAXIMUM CONNECTING TIME IF BP/RC/BI/DC/F1/F2\n          DISCOUNT IS APPLIED 12 HOURS.\n          MAXIMUM CONNECTING TIME IF CE DISCOUNT IS APPLIED\n           24 HOURS.\n          TRANSFERS LIMITTED TO THE ROUTING MAP INDICATED IN\n           THE FARE RECORD.\n"
                        },
                        {
                            "category": "SURCHARGE",
                            "description": "SU.SURCHARGES\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "TICKET ENDORSEMENT",
                            "description": "TE.TKT ENDORSEMENT\n \n  THE ORIGINAL AND THE REISSUED TICKET MUST BE ANNOTATED -\n  CHGS/ RFND RESTRICTED - IN THE ENDORSEMENT BOX.\n"
                        },
                        {
                            "category": "PENALTIES",
                            "description": "PE.PENALTIES\nFROM/TO AREA 2 FOR BUSINESS RESTRICTED FARES\n \n  CANCELLATIONS\n \n    BEFORE DEPARTURE\n      CANCELLATIONS PERMITTED FOR CANCEL/REFUND.\n \n    AFTER DEPARTURE\n      TICKET IS NON-REFUNDABLE IN CASE OF CANCEL/REFUND.\n \n  CHANGES\n \n    ANY TIME\n      CHANGES PERMITTED FOR REISSUE/REVALIDATION.\n      CHILD/INFANT DISCOUNTS APPLY.\n \n \n         NOTE -\n          NO SHOW NOT PERMITTED FOR CHANGES AND REFUND.\n          CHARGE FOR CHANGES APPLIES PER TRANSACTION/TICKET\n          AND PERSON TO ALL PASSENGER TYPES.\n          CHANGES RULES APPLY PER FARE COMPONENT/DIRECTION.\n          REFUND RULES APPLY PER FARE COMPONENT/DIRECTION.\n \n \n         NOTE -\n          IN CASE OF PASSENGERS HOSPITAL ADMISSION OR DEATH\n          OF PASSENGER OR FAMILY MEMBER PLEASE CONTACT WITH\n          THE AIRLINE.\n          ------------------------------------------------\n          TICKET IS NOT TRANSFERABLE TO ANOTHER PERSON.\n          ------------------------------------------------\n          IT WILL BE CONSIDERED NO-SHOW WHEN A PASSENGER\n          HAS NOT ADVISED THE AIRLINE THAT WILL NOT BE ABLE\n          TO MAKE THE FLIGHT IN WHICH THEY ARE BOOKED ON.\n          BEING NECESSARY THAH THE PASSENGER HAS CANCELED\n          AND REFUNDED OR CHANGED THE TICKET AT THE SAME\n          TIME.\n          ------------------------------------------------\n          REFUND AND CHANGES CONDITIONS APPLY WITHIN TICKET\n          VALIDITY.\n          ------------------------------------------------\n          IN CASE OF FARE COMBINATION CHARGE THE HIGHEST\n          FEE OF ALL CHANGED FARE COMPONENTS.\n          ------------------------------------------------\n          A CHANGE IS A DATE/FLIGHT/ROUTING/BOOKING CODE\n          CHANGE.\n          ------------------------------------------------\n          REISSUE MUST BE MADE AT THE SAME TIME AS CHANGE\n          OF RESERVATION BUT NO LATER TAN SCHEDULED\n          DEPARTURE TIME OF FLIGHT BEING CHANGED.\n          ------------------------------------------------\n               ---- REPRICING CONDITIONS ----\n          A.BEFORE DEPARTURE OF JOURNEY WHEN THE FIRST FARE\n          COMPONENT IS CHANGED THE ITINERARY MUST BE\n          RE-PRICED USING CURRENT FARES IN EFFECT ON THE\n          DATE THE TICKET IS REISSUED.\n          B.BEFORE DEPARTURE OF JOURNEY WHEN CHANGES ARE TO\n          BOOKING CODE ONLY IN THE FIRST FARE COMPONENT AND\n          RESULT IN A HIGHER FARE THE ITINERARY MUST BE\n          RE-PRICED USING HISTORICAL FARES IN EFFECT ON THE\n          PREVIOUS TICKETING DATE OR USING CURRENT FARE IN\n          EFFECT ON THE DATE THE TICKET IS REISSUED -\n          WICHEVER IS LOWER.\n          C. BEFORE DEPARTURE OF JOURNEY WHEN THERE ARE NO\n          CHANGES TO THE FIRST FARE COMPONENT BUT OTHER\n          FARE COMPONENTS ARE CHANGED THE ITINERARY MUST BE\n          RE-PRICED USING HISTORICAL FAERS IN EFFECT ON THE\n          PREVIOUS TICKETING DATE OR USING CURRENT FARES IN\n          EFFECT ON THE DATE THE TICKET IS REISSUED -\n          WHICHEVER IS LOWER.\n          D. AFTER DEPARTURE OF JOURNEY THE ITINERARY MUST\n          BE RE-PRICED USING HISTORICAL FARES IN EFFECT ON\n          THE PREVIOUS TICKETING DATE.\n          ------------------------------------------------\n          WHEN CHANGES ARE MADE NEW FARE AND RBD MUST BE\n          EQUAL OR HIGHER THAN ORIGINAL TICKET.\n          ------------------------------------------------\n          ANY NON-REFUNDABLE AMOUNT AND/OR CANCELLATION\n          PENALTY FROM A PREVIOUS TICKET REMAINS\n          NON-REFUNDABLE FOLLOWING A CHANGE.\n          ------------------------------------------------\n             -IF REFUND APPLY PER FARE COMPONENT /FC/-\n          WHEN COMBINING NON-REFUNDABLE FARES WITH A\n          REFUNDABLE FARES -\n          1-THE AMOUNT PAID ON EACH REFUNDABLE FARE\n          COMPONENT IS REFUNDED\n          2-THE AMOUNT PAID ON EACH NON-REFUNDABLE FARE\n          COMPONENT WILL NOT BE REFUNDED\n          3-WHEN COMBINING FARES CHARGE THE SUM OF THE\n          CANCELLATION FEES OF ALL CANCELLED FARE\n          COMPONENTS\n          ------------------------------------------------\n             -IF REFUND APPLY PER PRICING UNIT /PU/-\n          WHEN COMBINING NON-REFUNDABLE FARES WITH\n          REFUNDABLE FARES -\n          1. THE MOST RESTRICTIVE CANCELLATION CONDITION\n          APPLIES TO THE ENTIRE PRICING UNIT.\n          2. THE HIGHEST CANCELLATION PENALTY WITHIN THE\n          PRICING UNIT WILL BE CHARGED.\n          ------------------------------------------------\n             -IF MIX OF FC AND PU-\n          CALCULATE EACH AS SPECIFIED AND CHARGE THE SUM OF\n          THE CANCELLATIONS FEES.\n          ------------------------------------------------\n          REFUND OF UNUSED TAXES FEES AND CHARGES PAID TO\n          THIRD PARTIES PERMITTED EXCEPT FOR TAXES THAT ARE\n          LEGALLY NON-REFUNDABLE.\n          YQ/YR WILL BE REFUNDED IF THE FARE IS REFUNDABLE\n          OTHERWISE IT WOULD NOT BE ALLOWED.\n          ------------------------------------------------\n          REFUND FOR PARTLY USED TICKET-\n          IF A RETURN TICKET SHALL BE USED FOR ONE WAY\n          TRAVEL -\n          THE DIFFERENCE BETWEEN THE RETURN FARE AND THE\n          APPLICABLE ONE WAY FARE WILL/SHALL BE CALCULATED.\n          APPLICABLE ONE WAY IS THE ONE WAY FARE WITHIN THE\n          SAME OR HIGHER RBD.\n          ------------------------------------------------\n"
                        },
                        {
                            "category": "COMBINATIONS",
                            "description": "CO.COMBINABILITY\n   APPLICABLE ADD-ON CONSTRUCTION IS ADDRESSED IN\n   MISCELLANEOUS PROVISIONS - CATEGORY 23.\n  END-ON-END\n    END-ON-END COMBINATIONS PERMITTED. VALIDATE ALL FARE\n    COMPONENTS. SIDE TRIPS PERMITTED.\n   PROVIDED -\n     COMBINATIONS ARE NOT FOR CARRIER UX PUBLISHED FOR\n      TRAVEL VIA THE ATLANTIC.\n     EXCEPT AS PROVIDED ABOVE COMBINATIONS ARE WITH ANY\n     BUSINESS UNRESTRICTED/BUSINESS RESTRICTED-TYPE FARES\n     FOR CARRIER UX IN RULE WD01/WD02/WD03/WD04/WD05/WW01/\n      WW02/WW03/WW04/WW05 IN TARIFF\n      FBRA2P  - WITHIN AREA 2\n      OR ANY RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n  OPEN JAWS\n    FARES MAY BE COMBINED ON A HALF ROUND TRIP BASIS\n    -TO FORM SINGLE OR DOUBLE OPEN JAWS.\n   PROVIDED -\n     WHEN THE OPEN SEGMENT OCCURS NOT BETWEEN IBZ AND MAH/\n     BETWEEN ACE AND LPA/BETWEEN ACE AND SPC/BETWEEN ACE AND\n     TCI/BETWEEN FUE AND LPA/BETWEEN FUE AND SPC/BETWEEN FUE\n     AND TCI/BETWEEN LPA AND SPC/BETWEEN LPA AND TCI/BETWEEN\n     TCI AND SPC/BETWEEN PMI AND MAH/BETWEEN PMI AND IBZ\n     COMBINATIONS ARE WITH ANY BUSINESS UNRESTRICTED/\n     BUSINESS RESTRICTED-TYPE FARES FOR CARRIER UX IN ANY\n      RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n  ROUND TRIPS\n    FARES MAY BE COMBINED ON A HALF ROUND TRIP BASIS\n    -TO FORM ROUND TRIPS.\n   PROVIDED -\n     COMBINATIONS ARE WITH ANY FARE FOR CARRIER UX IN RULE\n      WD01/WD02/WD03/WD04/WD05/WW01/WW02/WW03/WW04/WW05 IN\n      TARIFF\n      FBRA2P  - WITHIN AREA 2\n      OR ANY RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n  CIRCLE TRIPS\n    FARES MAY BE COMBINED ON A HALF ROUND TRIP BASIS\n    -TO FORM CIRCLE TRIPS.\n   PROVIDED -\n     COMBINATIONS ARE WITH ANY BUSINESS UNRESTRICTED/\n     BUSINESS RESTRICTED-TYPE FARES FOR CARRIER UX IN RULE\n      WD01/WD02/WD03/WD04/WD05/WW01/WW02/WW03/WW04/WW05 IN\n      TARIFF\n      FBRA2P  - WITHIN AREA 2\n      OR ANY RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n"
                        },
                        {
                            "category": "MISCELLANEOUS PROVISIONS",
                            "description": "MD.MISCELLANEOUS DATA\n \n  THIS FARE MUST NOT BE USED AS THE HIGH OR THE LOW FARE\n  WHEN CALCULATING A DIFFERENTIAL. THIS FARE MAY BE USED AS\n  THE THROUGH FARE WHEN PRICING A FARE COMPONENT WITH OR\n  WITHOUT A DIFFERENTIAL.\n"
                        },
                        {
                            "category": "REISSUE",
                            "description": "VC.VOLUNTARY CHANGES\nFROM/TO AREA 2 FOR BUSINESS RESTRICTED FARES\n \n  IN THE EVENT OF CHANGES TO TICKETED FLIGHTS\n   BEFORE DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CERTAIN DOMESTIC REISSUE PROVISIONS MAY BE OVERRIDDEN BY\n    THOSE OF UX  INTERNATIONAL FARES\n     NO CHARGE OR HIGHEST FEE OF ALL CHANGED FARE\n     COMPONENTS- CATEGORY 19 DISCOUNTS APPLY AND\n      REPRICE USING FARES IN EFFECT WHEN TKT WAS ISSUED\n       PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n       1. NO CHANGE TO 1ST FARE COMPONENT\n       2. CHANGE IS BEFORE ORIGINAL SCHEDULED FLIGHT\n       3. UX  FARE TYPE BU/BR ARE USED\n       4. PUBLIC FARES ARE USED IF TICKETED FARE IS IN\n       PUBLIC TARIFF. PRIVATE FARES ARE USED IF TICKETED\n       FARE IS IN PRIVATE TARIFF\n       5. NEW TKT HAS EQUAL OR HIGHER VALUE THAN PREVIOUS\n       TKT\n       6. ALL RULE AND BOOKING CODE PROVISIONS ARE MET\n       7. ADV RES IS MEASURED FROM ORIGINAL TKT DATE TO\n       DEPARTURE OF PRICING UNIT\n      OR -\n      REPRICE USING FARES IN EFFECT TODAY\n       PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n       1. CHANGE IS BEFORE ORIGINAL SCHEDULED FLIGHT\n       2. UX  FARE TYPE BU/BR ARE USED\n       3. PUBLIC FARES ARE USED IF TICKETED FARE IS IN\n       PUBLIC TARIFF. PRIVATE FARES ARE USED IF TICKETED\n       FARE IS IN PRIVATE TARIFF\n       4. NEW TKT HAS EQUAL OR HIGHER VALUE THAN PREVIOUS\n       TKT\n       5. ADV RES IS MEASURED FROM REISSUE DATE TO DEPARTURE\n       OF PRICING UNIT\n   WHEN CHANGE RESULTS IN LOWER FARE IGNORE RESIDUAL THEN\n   ADD-COLLECT\n   ENDORSEMENT BOX- HIGHER NON-REF AMT AND NEW ENDORSEMENTS.\n  OR -\n   BEFORE DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CHANGES NOT PERMITTED/REFUND TKT-ANY REMAINING AMT WILL\n    APPLY TO NEW TKT\n     PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n     1. NO CHANGE TO\n     2. CHANGE IS AFTER ORIGINAL SCHEDULED FLIGHT.\n  OR -\n   AFTER DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CERTAIN DOMESTIC REISSUE PROVISIONS MAY BE OVERRIDDEN BY\n    THOSE OF UX  INTERNATIONAL FARES\n     NO CHARGE OR HIGHEST FEE OF ALL CHANGED FARE\n     COMPONENTS- CATEGORY 19 DISCOUNTS APPLY AND\n      REPRICE USING FARES IN EFFECT WHEN TKT WAS ISSUED\n       PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n       1. CHANGE IS BEFORE ORIGINAL SCHEDULED FLIGHT\n       2. UX  FARE TYPE BU/BR ARE USED\n       3. PUBLIC FARES ARE USED IF TICKETED FARE IS IN\n       PUBLIC TARIFF. PRIVATE FARES ARE USED IF TICKETED\n       FARE IS IN PRIVATE TARIFF\n       4. NEW TKT HAS EQUAL OR HIGHER VALUE THAN PREVIOUS\n       TKT\n       5. ALL RULE AND BOOKING CODE PROVISIONS ARE MET\n       6. ADV RES IS MEASURED FROM ORIGINAL TKT DATE TO\n       DEPARTURE OF PRICING UNIT\n   WHEN CHANGE RESULTS IN LOWER FARE IGNORE RESIDUAL THEN\n   ADD-COLLECT\n   ENDORSEMENT BOX- HIGHER NON-REF AMT AND NEW ENDORSEMENTS.\n  OR -\n   AFTER DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CHANGES NOT PERMITTED/REFUND TKT-ANY REMAINING AMT WILL\n    APPLY TO NEW TKT\n     PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n     1. NO CHANGE TO\n     2. CHANGE IS AFTER ORIGINAL SCHEDULED FLIGHT.\n \n  IN THE EVENT OF CHANGES TO TICKETED FLIGHTS\n   ANYTIME\n     CHANGES EXCEPT RBD NOT PERMITTED TO THE JOURNEY -\n     CHARGE HIGHEST FEE OF ALL CHANGED FARE COMPONENTS\n   WHEN CHANGE RESULTS IN LOWER FARE IGNORE RESIDUAL THEN\n   ADD-COLLECT.\n"
                        },
                        {
                            "category": "VOLUNTARY REFUNDS",
                            "description": "VR.VOLUNTARY REFUNDS\nFROM/TO AREA 2 FOR BUSINESS RESTRICTED FARES\n \n  REFUND MUST BE REQUESTED BEFORE DEPARTURE OF JOURNEY.\n   REFUND REQUEST REQUIRED BEFORE ORIGINALLY SCHEDULED\n   FLIGHT OF FIRST UNUSED TICKET COUPON.\n  NO CHARGE. IF ALL PENALTIES ARE PER FARE COMPONENT COLLECT\n   EACH. IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY. DISCOUNT\n   APPLIES TO CHILD/INFANT.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE. FORM OF REFUND - ORIGINAL FORM OF PAYMENT. ONLY\n   VALIDATING CARRIER MAY REFUND TICKET.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  JOURNEY IS NONREFUNDABLE BEFORE DEPARTURE OF JOURNEY.\n   JOURNEY IS NONREFUNDABLE ANYTIME AFTER ORIGINALLY\n   SCHEDULED FLIGHT OF FIRST UNUSED TICKET COUPON.\n  IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  FARE IS NONREFUNDABLE AFTER DEPARTURE OF JOURNEY. FARE IS\n   NONREFUNDABLE BEFORE ORIGINALLY SCHEDULED FLIGHT OF FIRST\n   UNUSED TICKET COUPON.\n  IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  FARE IS NONREFUNDABLE AFTER DEPARTURE OF JOURNEY. FARE IS\n   NONREFUNDABLE ANYTIME AFTER ORIGINALLY SCHEDULED FLIGHT\n   OF FIRST UNUSED TICKET COUPON.\n  IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  REFUND MAY BE REQUESTED ANYTIME.\n  FARE IS NONREFUNDABLE. IF THERE IS A MIX OF PENALTY\n   APPLICATIONS, THE MOST RESTRICTIVE APPLIES TO THE ENTIRE\n   JOURNEY.\n  REPRICE USING EQUAL OR HIGHER RBD.\n"
                        }
                    ],
                    "fare": "BUSINESS FLEX",
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "BCN",
                            "arrival": "MAD",
                            "departureDateTime": "2025-11-26 11:50:00",
                            "arrivalDateTime": "2025-11-26 13:20:00",
                            "marketingCompany": "UX",
                            "operatingCompany": "UX",
                            "transportNumber": "7706",
                            "transportType": "PLANE",
                            "includedBaggage": "2 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "BUSINESS",
                            "technicalStopsVO": []
                        }
                    ]
                },
                {
                    "ref": "15:10MADBCNUX7703BUSINESS",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureTime": "2025-11-30 15:10:00",
                    "arrivalTime": "2025-11-30 16:35:00",
                    "duration": 85,
                    "fareRules": [
                        {
                            "category": "RULE APPLICATION",
                            "description": "RU.RULE APPLICATION\nUX BUSINESS FLEX FARES\n APPLICATION\n   AREA\n     THESE FARES APPLY\n     WITHIN SPAIN AND CANARY ISLANDS.\n   CLASS OF SERVICE\n     THESE FARES APPLY FOR BUSINESS CLASS SERVICE.\n   TYPES OF TRANSPORTATION\n     FARES GOVERNED BY THIS RULE CAN BE USED TO CREATE\n     ONE-WAY/ROUND-TRIP/CIRCLE-TRIP/OPEN-JAW/SINGLE OPEN-\n     JAW/DOUBLE OPEN-JAW JOURNEYS.\n CAPACITY LIMITATIONS\n   THE CARRIER SHALL LIMIT THE NUMBER OF PASSENGERS CARRIED\n   ON ANY ONE FLIGHT AT FARES GOVERNED BY THIS RULE AND SUCH\n   FARES WILL NOT NECESSARILY BE AVAILABLE ON ALL FLIGHTS.\n   THE NUMBER OF SEATS WHICH THE CARRIER SHALL MAKE\n   AVAILABLE ON A GIVEN FLIGHT WILL BE DETERMINED BY THE\n   CARRIERS BEST JUDGMENT\n"
                        },
                        {
                            "category": "MINIMUM STAY",
                            "description": "MN.MIN STAY\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "MAXIMUM_STAY",
                            "description": "MX.MAX STAY\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "SALES RESTRICTIONS",
                            "description": "SR.SALES RESTRICT\nFROM/TO SPAIN AND CANARY ISLANDS\n \n  TICKETS MUST BE ISSUED ON UX  AND MAY NOT BE SOLD IN\n  VENEZUELA/RUSSIA/RUSSIA (EAST OF THE URALS)/TURKMENISTAN/\n  AFGHANISTAN/KYRGYZSTAN/BELARUS/TAJIKISTAN/KAZAKHSTAN/\n  PAKISTAN/UZBEKISTAN/AZERBAIJAN/BOLIVIA AND MAY ONLY BE\n  SOLD IN AREA 2/AREA 3/AREA 1\n  TICKETS MAY NOT BE ISSUED BY PTA. EXTENSION OF TICKET\n  VALIDITY IS NOT PERMITTED.\n"
                        },
                        {
                            "category": "ADVANCE_PURCHASE",
                            "description": "AP.ADVANCE RES/TKT\nBETWEEN MAD AND BCN\n \n  RESERVATIONS ARE REQUIRED FOR ALL SECTORS FOR DEPARTURE OF\n  EACH TRIP.\n  WHEN RESERVATIONS ARE MADE AT LEAST 2 DAYS BEFORE\n  DEPARTURE TICKETING FOR DEPARTURE OF EACH TRIP MUST BE\n  COMPLETED WITHIN 1 DAY AFTER RESERVATIONS ARE MADE.\n  OR - RESERVATIONS FOR ALL SECTORS AND TICKETING MUST BE\n       COMPLETED AT THE SAME TIME.\n         NOTE -\n           DIFFERENCE COULD EXIST BETWEEN THE CRS\n           LAST TICKETING DATE AND TTL ROBOT REMARK.\n           THE MOST RESTRICTIVE DATE PREVAILS.\n"
                        },
                        {
                            "category": "FLIGHT APPLICATIONS",
                            "description": "FL.FLT APPLICATION\n \n  THE FARE COMPONENT MUST BE ON\n      ONE OR MORE OF THE FOLLOWING\n        ANY UX FLIGHT.\n"
                        },
                        {
                            "category": "CHILDREN DISCOUNT",
                            "description": "CD.CHILD DISCOUNTS\n \n  ACCOMPANIED CHILD 2-11 - CHARGE 85 PERCENT OF THE FARE.\n        TICKET DESIGNATOR - CH.\n    MUST BE ACCOMPANIED ON ALL FLIGHTS IN SAME COMPARTMENT\n      BY ADULT 18 OR OLDER\n  OR - UNACCOMPANIED CHILD 5-11 - CHARGE 85 PERCENT OF THE\n         FARE.\n             TICKET DESIGNATOR - CH.\n         NOTE -\n          AN ACCEPTANCE LIMIT ON THE NUMBER OF UNACCOMPANIED\n          CHILD WILL BE CONSIDER\n  OR - INFANT UNDER 2 WITH A SEAT - CHARGE 85 PERCENT OF THE\n         FARE.\n             TICKET DESIGNATOR - IN.\n         MUST BE ACCOMPANIED ON ALL FLIGHTS IN SAME\n           COMPARTMENT BY ADULT 18 OR OLDER.\n         NOTE -\n          AN INFANT UNDER TWO YEARS WHO MAY TURN 2 YEARS\n          OF AGE BEFORE THE END OF THE TRIP MUST PAY A\n          CHILD FARE FOR THE ENTIRE JOURNEY\n  OR - 1ST INFANT UNDER 2 WITHOUT A SEAT - CHARGE 10 PERCENT\n         OF THE FARE.\n             TICKET DESIGNATOR - IN.\n         MUST BE ACCOMPANIED ON ALL FLIGHTS IN SAME\n           COMPARTMENT BY ADULT 18 OR OLDER.\n"
                        },
                        {
                            "category": "TOUR CONDUCTOR DISCOUNT",
                            "description": "TC.TOUR CONDUCTOR\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "AGENT DISCOUNT ",
                            "description": "AD.AGTS DISCOUNTS\n \n         NOTE -\n          AGENT DISCOUNTS PERMITTED.\n"
                        },
                        {
                            "category": "ALL OTHER DISCOUNTS",
                            "description": "OD.OTHER DISCOUNTS\n \n         NOTE -\n          DISCOUNTS PERMITTED- BP/RC/DC/F1/F2/RE/RM\n  *** GENERAL RULE FOLLOWS ***\nFROM/TO SPAIN AND CANARY ISLANDS\n \n         NOTE -\n          DM/GR DISCOUNTS MAY APPLY\n"
                        },
                        {
                            "category": "STOPOVERS",
                            "description": "SO.STOPOVERS\nFROM/TO SPAIN AND CANARY ISLANDS\n \n  NO STOPOVERS PERMITTED.\n"
                        },
                        {
                            "category": "TRANSFER",
                            "description": "TF.TRANSFERS/RTGS\nFOR DDYYEH TYPE FARES\n \n  TRANSFERS NOT PERMITTED ON THE FARE COMPONENT\n    FARE BREAK SURFACE SECTORS NOT PERMITTED AND EMBEDDED\n     SURFACE SECTORS PERMITTED ON THE FARE COMPONENT.\n         NOTE -\n          MAXIMUM CONNECTING TIME IF BP/RC/BI/DC/F1/F2\n          DISCOUNT IS APPLIED 12 HOURS.\n          MAXIMUM CONNECTING TIME IF CE DISCOUNT IS APPLIED\n           24 HOURS.\n          TRANSFERS LIMITTED TO THE ROUTING MAP INDICATED IN\n           THE FARE RECORD.\n"
                        },
                        {
                            "category": "SURCHARGE",
                            "description": "SU.SURCHARGES\n  NONE UNLESS OTHERWISE SPECIFIED\n"
                        },
                        {
                            "category": "TICKET ENDORSEMENT",
                            "description": "TE.TKT ENDORSEMENT\n \n  THE ORIGINAL AND THE REISSUED TICKET MUST BE ANNOTATED -\n  CHGS/ RFND RESTRICTED - IN THE ENDORSEMENT BOX.\n"
                        },
                        {
                            "category": "PENALTIES",
                            "description": "PE.PENALTIES\nFROM/TO AREA 2 FOR BUSINESS RESTRICTED FARES\n \n  CANCELLATIONS\n \n    BEFORE DEPARTURE\n      CANCELLATIONS PERMITTED FOR CANCEL/REFUND.\n \n    AFTER DEPARTURE\n      TICKET IS NON-REFUNDABLE IN CASE OF CANCEL/REFUND.\n \n  CHANGES\n \n    ANY TIME\n      CHANGES PERMITTED FOR REISSUE/REVALIDATION.\n      CHILD/INFANT DISCOUNTS APPLY.\n \n \n         NOTE -\n          NO SHOW NOT PERMITTED FOR CHANGES AND REFUND.\n          CHARGE FOR CHANGES APPLIES PER TRANSACTION/TICKET\n          AND PERSON TO ALL PASSENGER TYPES.\n          CHANGES RULES APPLY PER FARE COMPONENT/DIRECTION.\n          REFUND RULES APPLY PER FARE COMPONENT/DIRECTION.\n \n \n         NOTE -\n          IN CASE OF PASSENGERS HOSPITAL ADMISSION OR DEATH\n          OF PASSENGER OR FAMILY MEMBER PLEASE CONTACT WITH\n          THE AIRLINE.\n          ------------------------------------------------\n          TICKET IS NOT TRANSFERABLE TO ANOTHER PERSON.\n          ------------------------------------------------\n          IT WILL BE CONSIDERED NO-SHOW WHEN A PASSENGER\n          HAS NOT ADVISED THE AIRLINE THAT WILL NOT BE ABLE\n          TO MAKE THE FLIGHT IN WHICH THEY ARE BOOKED ON.\n          BEING NECESSARY THAH THE PASSENGER HAS CANCELED\n          AND REFUNDED OR CHANGED THE TICKET AT THE SAME\n          TIME.\n          ------------------------------------------------\n          REFUND AND CHANGES CONDITIONS APPLY WITHIN TICKET\n          VALIDITY.\n          ------------------------------------------------\n          IN CASE OF FARE COMBINATION CHARGE THE HIGHEST\n          FEE OF ALL CHANGED FARE COMPONENTS.\n          ------------------------------------------------\n          A CHANGE IS A DATE/FLIGHT/ROUTING/BOOKING CODE\n          CHANGE.\n          ------------------------------------------------\n          REISSUE MUST BE MADE AT THE SAME TIME AS CHANGE\n          OF RESERVATION BUT NO LATER TAN SCHEDULED\n          DEPARTURE TIME OF FLIGHT BEING CHANGED.\n          ------------------------------------------------\n               ---- REPRICING CONDITIONS ----\n          A.BEFORE DEPARTURE OF JOURNEY WHEN THE FIRST FARE\n          COMPONENT IS CHANGED THE ITINERARY MUST BE\n          RE-PRICED USING CURRENT FARES IN EFFECT ON THE\n          DATE THE TICKET IS REISSUED.\n          B.BEFORE DEPARTURE OF JOURNEY WHEN CHANGES ARE TO\n          BOOKING CODE ONLY IN THE FIRST FARE COMPONENT AND\n          RESULT IN A HIGHER FARE THE ITINERARY MUST BE\n          RE-PRICED USING HISTORICAL FARES IN EFFECT ON THE\n          PREVIOUS TICKETING DATE OR USING CURRENT FARE IN\n          EFFECT ON THE DATE THE TICKET IS REISSUED -\n          WICHEVER IS LOWER.\n          C. BEFORE DEPARTURE OF JOURNEY WHEN THERE ARE NO\n          CHANGES TO THE FIRST FARE COMPONENT BUT OTHER\n          FARE COMPONENTS ARE CHANGED THE ITINERARY MUST BE\n          RE-PRICED USING HISTORICAL FAERS IN EFFECT ON THE\n          PREVIOUS TICKETING DATE OR USING CURRENT FARES IN\n          EFFECT ON THE DATE THE TICKET IS REISSUED -\n          WHICHEVER IS LOWER.\n          D. AFTER DEPARTURE OF JOURNEY THE ITINERARY MUST\n          BE RE-PRICED USING HISTORICAL FARES IN EFFECT ON\n          THE PREVIOUS TICKETING DATE.\n          ------------------------------------------------\n          WHEN CHANGES ARE MADE NEW FARE AND RBD MUST BE\n          EQUAL OR HIGHER THAN ORIGINAL TICKET.\n          ------------------------------------------------\n          ANY NON-REFUNDABLE AMOUNT AND/OR CANCELLATION\n          PENALTY FROM A PREVIOUS TICKET REMAINS\n          NON-REFUNDABLE FOLLOWING A CHANGE.\n          ------------------------------------------------\n             -IF REFUND APPLY PER FARE COMPONENT /FC/-\n          WHEN COMBINING NON-REFUNDABLE FARES WITH A\n          REFUNDABLE FARES -\n          1-THE AMOUNT PAID ON EACH REFUNDABLE FARE\n          COMPONENT IS REFUNDED\n          2-THE AMOUNT PAID ON EACH NON-REFUNDABLE FARE\n          COMPONENT WILL NOT BE REFUNDED\n          3-WHEN COMBINING FARES CHARGE THE SUM OF THE\n          CANCELLATION FEES OF ALL CANCELLED FARE\n          COMPONENTS\n          ------------------------------------------------\n             -IF REFUND APPLY PER PRICING UNIT /PU/-\n          WHEN COMBINING NON-REFUNDABLE FARES WITH\n          REFUNDABLE FARES -\n          1. THE MOST RESTRICTIVE CANCELLATION CONDITION\n          APPLIES TO THE ENTIRE PRICING UNIT.\n          2. THE HIGHEST CANCELLATION PENALTY WITHIN THE\n          PRICING UNIT WILL BE CHARGED.\n          ------------------------------------------------\n             -IF MIX OF FC AND PU-\n          CALCULATE EACH AS SPECIFIED AND CHARGE THE SUM OF\n          THE CANCELLATIONS FEES.\n          ------------------------------------------------\n          REFUND OF UNUSED TAXES FEES AND CHARGES PAID TO\n          THIRD PARTIES PERMITTED EXCEPT FOR TAXES THAT ARE\n          LEGALLY NON-REFUNDABLE.\n          YQ/YR WILL BE REFUNDED IF THE FARE IS REFUNDABLE\n          OTHERWISE IT WOULD NOT BE ALLOWED.\n          ------------------------------------------------\n          REFUND FOR PARTLY USED TICKET-\n          IF A RETURN TICKET SHALL BE USED FOR ONE WAY\n          TRAVEL -\n          THE DIFFERENCE BETWEEN THE RETURN FARE AND THE\n          APPLICABLE ONE WAY FARE WILL/SHALL BE CALCULATED.\n          APPLICABLE ONE WAY IS THE ONE WAY FARE WITHIN THE\n          SAME OR HIGHER RBD.\n          ------------------------------------------------\n"
                        },
                        {
                            "category": "COMBINATIONS",
                            "description": "CO.COMBINABILITY\n   APPLICABLE ADD-ON CONSTRUCTION IS ADDRESSED IN\n   MISCELLANEOUS PROVISIONS - CATEGORY 23.\n  END-ON-END\n    END-ON-END COMBINATIONS PERMITTED. VALIDATE ALL FARE\n    COMPONENTS. SIDE TRIPS PERMITTED.\n   PROVIDED -\n     COMBINATIONS ARE NOT FOR CARRIER UX PUBLISHED FOR\n      TRAVEL VIA THE ATLANTIC.\n     EXCEPT AS PROVIDED ABOVE COMBINATIONS ARE WITH ANY\n     BUSINESS UNRESTRICTED/BUSINESS RESTRICTED-TYPE FARES\n     FOR CARRIER UX IN RULE WD01/WD02/WD03/WD04/WD05/WW01/\n      WW02/WW03/WW04/WW05 IN TARIFF\n      FBRA2P  - WITHIN AREA 2\n      OR ANY RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n  OPEN JAWS\n    FARES MAY BE COMBINED ON A HALF ROUND TRIP BASIS\n    -TO FORM SINGLE OR DOUBLE OPEN JAWS.\n   PROVIDED -\n     WHEN THE OPEN SEGMENT OCCURS NOT BETWEEN IBZ AND MAH/\n     BETWEEN ACE AND LPA/BETWEEN ACE AND SPC/BETWEEN ACE AND\n     TCI/BETWEEN FUE AND LPA/BETWEEN FUE AND SPC/BETWEEN FUE\n     AND TCI/BETWEEN LPA AND SPC/BETWEEN LPA AND TCI/BETWEEN\n     TCI AND SPC/BETWEEN PMI AND MAH/BETWEEN PMI AND IBZ\n     COMBINATIONS ARE WITH ANY BUSINESS UNRESTRICTED/\n     BUSINESS RESTRICTED-TYPE FARES FOR CARRIER UX IN ANY\n      RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n  ROUND TRIPS\n    FARES MAY BE COMBINED ON A HALF ROUND TRIP BASIS\n    -TO FORM ROUND TRIPS.\n   PROVIDED -\n     COMBINATIONS ARE WITH ANY FARE FOR CARRIER UX IN RULE\n      WD01/WD02/WD03/WD04/WD05/WW01/WW02/WW03/WW04/WW05 IN\n      TARIFF\n      FBRA2P  - WITHIN AREA 2\n      OR ANY RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n  CIRCLE TRIPS\n    FARES MAY BE COMBINED ON A HALF ROUND TRIP BASIS\n    -TO FORM CIRCLE TRIPS.\n   PROVIDED -\n     COMBINATIONS ARE WITH ANY BUSINESS UNRESTRICTED/\n     BUSINESS RESTRICTED-TYPE FARES FOR CARRIER UX IN RULE\n      WD01/WD02/WD03/WD04/WD05/WW01/WW02/WW03/WW04/WW05 IN\n      TARIFF\n      FBRA2P  - WITHIN AREA 2\n      OR ANY RULE IN TARIFF\n      IPREURD - WITHIN EUROPE-DOMESTIC.\n"
                        },
                        {
                            "category": "MISCELLANEOUS PROVISIONS",
                            "description": "MD.MISCELLANEOUS DATA\n \n  THIS FARE MUST NOT BE USED AS THE HIGH OR THE LOW FARE\n  WHEN CALCULATING A DIFFERENTIAL. THIS FARE MAY BE USED AS\n  THE THROUGH FARE WHEN PRICING A FARE COMPONENT WITH OR\n  WITHOUT A DIFFERENTIAL.\n"
                        },
                        {
                            "category": "REISSUE",
                            "description": "VC.VOLUNTARY CHANGES\nFROM/TO AREA 2 FOR BUSINESS RESTRICTED FARES\n \n  IN THE EVENT OF CHANGES TO TICKETED FLIGHTS\n   BEFORE DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CERTAIN DOMESTIC REISSUE PROVISIONS MAY BE OVERRIDDEN BY\n    THOSE OF UX  INTERNATIONAL FARES\n     NO CHARGE OR HIGHEST FEE OF ALL CHANGED FARE\n     COMPONENTS- CATEGORY 19 DISCOUNTS APPLY AND\n      REPRICE USING FARES IN EFFECT WHEN TKT WAS ISSUED\n       PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n       1. NO CHANGE TO 1ST FARE COMPONENT\n       2. CHANGE IS BEFORE ORIGINAL SCHEDULED FLIGHT\n       3. UX  FARE TYPE BU/BR ARE USED\n       4. PUBLIC FARES ARE USED IF TICKETED FARE IS IN\n       PUBLIC TARIFF. PRIVATE FARES ARE USED IF TICKETED\n       FARE IS IN PRIVATE TARIFF\n       5. NEW TKT HAS EQUAL OR HIGHER VALUE THAN PREVIOUS\n       TKT\n       6. ALL RULE AND BOOKING CODE PROVISIONS ARE MET\n       7. ADV RES IS MEASURED FROM ORIGINAL TKT DATE TO\n       DEPARTURE OF PRICING UNIT\n      OR -\n      REPRICE USING FARES IN EFFECT TODAY\n       PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n       1. CHANGE IS BEFORE ORIGINAL SCHEDULED FLIGHT\n       2. UX  FARE TYPE BU/BR ARE USED\n       3. PUBLIC FARES ARE USED IF TICKETED FARE IS IN\n       PUBLIC TARIFF. PRIVATE FARES ARE USED IF TICKETED\n       FARE IS IN PRIVATE TARIFF\n       4. NEW TKT HAS EQUAL OR HIGHER VALUE THAN PREVIOUS\n       TKT\n       5. ADV RES IS MEASURED FROM REISSUE DATE TO DEPARTURE\n       OF PRICING UNIT\n   WHEN CHANGE RESULTS IN LOWER FARE IGNORE RESIDUAL THEN\n   ADD-COLLECT\n   ENDORSEMENT BOX- HIGHER NON-REF AMT AND NEW ENDORSEMENTS.\n  OR -\n   BEFORE DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CHANGES NOT PERMITTED/REFUND TKT-ANY REMAINING AMT WILL\n    APPLY TO NEW TKT\n     PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n     1. NO CHANGE TO\n     2. CHANGE IS AFTER ORIGINAL SCHEDULED FLIGHT.\n  OR -\n   AFTER DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CERTAIN DOMESTIC REISSUE PROVISIONS MAY BE OVERRIDDEN BY\n    THOSE OF UX  INTERNATIONAL FARES\n     NO CHARGE OR HIGHEST FEE OF ALL CHANGED FARE\n     COMPONENTS- CATEGORY 19 DISCOUNTS APPLY AND\n      REPRICE USING FARES IN EFFECT WHEN TKT WAS ISSUED\n       PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n       1. CHANGE IS BEFORE ORIGINAL SCHEDULED FLIGHT\n       2. UX  FARE TYPE BU/BR ARE USED\n       3. PUBLIC FARES ARE USED IF TICKETED FARE IS IN\n       PUBLIC TARIFF. PRIVATE FARES ARE USED IF TICKETED\n       FARE IS IN PRIVATE TARIFF\n       4. NEW TKT HAS EQUAL OR HIGHER VALUE THAN PREVIOUS\n       TKT\n       5. ALL RULE AND BOOKING CODE PROVISIONS ARE MET\n       6. ADV RES IS MEASURED FROM ORIGINAL TKT DATE TO\n       DEPARTURE OF PRICING UNIT\n   WHEN CHANGE RESULTS IN LOWER FARE IGNORE RESIDUAL THEN\n   ADD-COLLECT\n   ENDORSEMENT BOX- HIGHER NON-REF AMT AND NEW ENDORSEMENTS.\n  OR -\n   AFTER DEPARTURE OF JOURNEY - APPLIES WITHIN TKT VALIDITY\n    CHANGES NOT PERMITTED/REFUND TKT-ANY REMAINING AMT WILL\n    APPLY TO NEW TKT\n     PROVIDED ALL OF THE FOLLOWING CONDITIONS ARE MET-\n     1. NO CHANGE TO\n     2. CHANGE IS AFTER ORIGINAL SCHEDULED FLIGHT.\n \n  IN THE EVENT OF CHANGES TO TICKETED FLIGHTS\n   ANYTIME\n     CHANGES EXCEPT RBD NOT PERMITTED TO THE JOURNEY -\n     CHARGE HIGHEST FEE OF ALL CHANGED FARE COMPONENTS\n   WHEN CHANGE RESULTS IN LOWER FARE IGNORE RESIDUAL THEN\n   ADD-COLLECT.\n"
                        },
                        {
                            "category": "VOLUNTARY REFUNDS",
                            "description": "VR.VOLUNTARY REFUNDS\nFROM/TO AREA 2 FOR BUSINESS RESTRICTED FARES\n \n  REFUND MUST BE REQUESTED BEFORE DEPARTURE OF JOURNEY.\n   REFUND REQUEST REQUIRED BEFORE ORIGINALLY SCHEDULED\n   FLIGHT OF FIRST UNUSED TICKET COUPON.\n  NO CHARGE. IF ALL PENALTIES ARE PER FARE COMPONENT COLLECT\n   EACH. IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY. DISCOUNT\n   APPLIES TO CHILD/INFANT.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE. FORM OF REFUND - ORIGINAL FORM OF PAYMENT. ONLY\n   VALIDATING CARRIER MAY REFUND TICKET.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  JOURNEY IS NONREFUNDABLE BEFORE DEPARTURE OF JOURNEY.\n   JOURNEY IS NONREFUNDABLE ANYTIME AFTER ORIGINALLY\n   SCHEDULED FLIGHT OF FIRST UNUSED TICKET COUPON.\n  IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  FARE IS NONREFUNDABLE AFTER DEPARTURE OF JOURNEY. FARE IS\n   NONREFUNDABLE BEFORE ORIGINALLY SCHEDULED FLIGHT OF FIRST\n   UNUSED TICKET COUPON.\n  IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  FARE IS NONREFUNDABLE AFTER DEPARTURE OF JOURNEY. FARE IS\n   NONREFUNDABLE ANYTIME AFTER ORIGINALLY SCHEDULED FLIGHT\n   OF FIRST UNUSED TICKET COUPON.\n  IF THERE IS A MIX OF PENALTY APPLICATIONS, THE MOST\n   RESTRICTIVE APPLIES TO THE ENTIRE JOURNEY.\n  REFUND REQUEST MUST BE LESS THAN ONE YEAR AFTER TICKET\n   ISSUANCE.\n  REPRICE USING EQUAL OR HIGHER RBD/ANY FARE TYPE EXCEPT EOU\n   ERU XPX XOX EU ER EP EPP EUP BX BOX.\n  OR -\n  REFUND MAY BE REQUESTED ANYTIME.\n  FARE IS NONREFUNDABLE. IF THERE IS A MIX OF PENALTY\n   APPLICATIONS, THE MOST RESTRICTIVE APPLIES TO THE ENTIRE\n   JOURNEY.\n  REPRICE USING EQUAL OR HIGHER RBD.\n"
                        }
                    ],
                    "fare": "BUSINESS FLEX",
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "BCN",
                            "departureDateTime": "2025-11-30 15:10:00",
                            "arrivalDateTime": "2025-11-30 16:35:00",
                            "marketingCompany": "UX",
                            "operatingCompany": "UX",
                            "transportNumber": "7703",
                            "transportType": "PLANE",
                            "includedBaggage": "2 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "BUSINESS",
                            "technicalStopsVO": []
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2025-10-08",
                    "amount": {
                        "amount": 941.1,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "extraBaggageOptions": []
}
```

**Confirm two one ways**

For booking two OW transports on a RT request, the request is different

The outbound recommendation key will be **outboundRecommendationKey**. The inbound recommendation key will be **inboundRecommendationKey**.

Only one **service** with two **journeys** will be returned for RT fare transports. Two **services** with one **journey** each will be returned for two OW transports.

Confim - Two one ways - request

```
{
    "transports": {
        "outboundRecommendationKey" : "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNqMVNtu4jAQ_ZXKz1DlAhR4SyGtUMtluTxUq9XKSQbqbbCztkMXVfz7ziTh0kK3K-Uh9sz4zJw5M2_MWMhYl31bjOdhn9UY33CR8kikwm4HCev6rWaN_VK5lrA1rPv9jSWQcW1zDX1uAUM9x_PrTqvutTD8YETDMOif3sy3Gd32w9l8MArmg_GI4LQWG57i_XQcHs8XfHe1z6F95wN0-dj_QpeJ_gP6R42p3EYql8jIG8u02ogEdE_JpVjlmluhJJHleW2vxiTYiRYxkCtfY5BFGp3mtduosTjXGmS8RYRwMcWiyLun1mthDD7CoxTOYp1r51Kg5X_AnDl7l533KU9hCWSiEu-Ch7DuNht-46bj-R2kIOZoSdOinolKRSyg6vkp38260ya-KsSviyT-YiWt5rEdqoTvtYWZajCYlrR9YWJ65I5T_5Y8NVBjSzxM87TIgVog4ZVvq4qtztEjVa-xMvYQwePilZ5K9kEa1ly_VIeIGyCEoEh4AnrCjQG5Al3aU27sXMQvYIVc9d_X7LrsSOMsz7JUUFjB4s_ZYjJ5HIRTdNGkEqtFNgOu4-d9pmpDetn3-aQqlJxAehEwEDoVEih5fHdwy8qEAprIuVi_a0Dnym123ZuuWyi_kiDruh3klCeJoCNPUaAWOZ_C71xoSLAiXoIeXQoGVpKU8dEJ79fYmq-m_sr1uo6D33GGLvhgtpXP-Yo4TuJdb4xnFIo0mdJ2lK-jA8nYAbcolxoKnxCmMtCfkUkFZlRRdclKhVUnhKguqg0wWdw-Dnrn9EZ8teIrGMilQi_fuXq4L0YnErKH_TLVe2FvPBoPn9AUKfWCGZ0an06r3OM9BqOwLE8LBLhHJWWVsndFO1KILSS3JT71CAc7EQbFFuVlgribQBv6w5YJHDHW9Nuu2_ZJvBoJANz3SUDRvkMbtfC5cVuO7zQ65z47gjC4_WMYFqxTYbNCmHKVF1mwkJYp_MlEydKHsSGltg5KlXwNvWeMhWR6HMzdXwAAAP__.cFtyxlTSn6r0PhqfCa0TXhCqtiqQ4RQ2-hx_yRxc9n4",
        "inboundRecommendationKey" : "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNqMVNtS2zAQ_RVGzwnjS65-M4npZEouDeGB6fRBsTdGxZZcSQYyTP69u7ZDAgm0frK013P2rF6ZsVCwgP24m6-iMWsx_sRFxtciE3Y7SVjg97ot9luVWsLWsODnK0ug4NqWGsbcAoZ6jue3nV7b62H4mxEN03B8fLPaFnQ7jm5Xk1m4msxnVE5r8cQzvF_Oo8P5jO-u9Xlp3_lQuk72v6XrRr8o_avFhFyrUiIhr6zQ6kkkoEdKbkRaam6FksSV5w28FpNgF1rEQK48xyDLAtf1Lrv9FotLrUHGWywQ3S0RE3mPVJ4LYzAJX2dwEutcOucCLX8Bc-LsnXfet7yEDZCJEF6H36O22-34nf7Q84fIQMzRkmUVnoXKRCygGfkx3d22MyC6mor_Bkn0xUpazWM7VQnfSws71WCwLWnHwsSU5JrT-DY8M9BiGzwsy6zqAVMoCc982yC2ukSPTD3Hyti3CB5XWUYq2QdpyLl-bA5rboAqhFXDC9ALbgzIFHRtz7ixKxE_ghUyHb_H7LqIWZMErBbFLXAdP-zbUE8khv0Qj1pGOQnkDrOFQmdCAnWGSSdXrK4W0ratRP6O3eGF2w3cfuBWqm70hfQOkTCeJIKOPEP1WSR0CX9KoSHBdnld9OBSwUsljf2jE97nyPvXG-07F64XeE7gOIf9OOPTDfzG5_0OTs9sGapAmkJpOyvzNRHf6BC_DmWgccEnjKkC9GdsEsKCIDWXrNZPc8IazUWz3ou7q5vJ6JTfGJ8-OcLRmCYyGs1n8-k9eq6VesTax8b7Y0D7zDfhLKqBaMFT-IaiKRqF7irmM4gtJFc8TdFM48AFTYRBXa3LuhV8Y0Ab-sPpCFwV1vUHrjvwKxEiVMBnOwkp2nfoYax8-m7P8Z3O8NRnRyUMPuIxTCt-CdhtpUGZllUXLKI3EV4KUfPxQf4kyt6bKCXPYfSAsZAsDwu2-wsAAP__.krZ8D94Yr8f27MDt_1enb-DQav0DckJn1FxFaiQO1vk"
    }
}
```

Confim - Two one ways - response

```
{
    "auditData": {
        "timestamp": "2023-05-09 09:43:27",
        "processTime": 19,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM2MjYxNDQsImp0aSI6IkJBOUUwQjgyLUU2RjMtNEUwMy1CMTcyLTEwNTRDMjFDNzQ0QiJ9.SLU0EirYA9j4b3okiWFNOyhf3HIcAjRFOBhqsZYa-3HWLKh6GVLmTK2hJtRIDvap_3QNcOYGfumlY50pTVdTnQ",
        "traceId": "BA9E0B82-E6F3-4E03-B172-1054C21C744B",
        "availabilityId": 192,
        "server": "http://production-tomee-server-1.travelc.internal:30047"
    },
    "priceBreakdown": {
        "totalPrice": {
            "amount": 197.63,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "recommendationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNrsV9tu4kgQ_RXkZxL5gmPgzSFOhCZcZMhDtBqN2nZBemO6vd3tzKAo_75VtgkkBEbMSBtpNW901-1U1alq82xpA4XVtwaT8fUwHkVXVttiT4znLOE5N-thZvWdntu2_palErDWVv-vZyuDgilTKrhiBtDatV3vzL44cy_Q_FWIgulouHszXxd0O4_D8Ww6ieffLsNZRBGV4k8sR1E8GW3PH6u_tA8D8Ox3AGp_JwCoER8H8LVtydIkshRYnWerUPKJZ6AGUiz4slTMcCmocK7bxcoJMFPFUyBVtkIjgyX1OueB37bSUikQ6RqDRHcxpkbaA7laca3RCUty2LO1z-2PDA37AXpP2f1YeQM5hgWQiLK8Dr9EZ44beH7geS4VMmUoyfMqn6nMecqh6f9u1f0zu0slayL-PEmqXyqFUSw1I5mxDc8QqQKNsIS54jolJ9eMurhguYa2tcBDXOYNhhQxLKVaN8hbg3Ae3Uzie6fqt04VLwg3idkjtMi4pdC6tSN0KjId8uSe4Mk96sk7wZN31FPnBE-do578Ezz5NecFfGfrhmJGldiSXH5PpTavLWJp1baBzKoufaWOrph6bA4J00AtDSuGTEFNmdYglqBqec60mfP0EQwXy6u3JHOosRvezsqiyDmZVUl9m91Np7fDKEYVRWNpEPgMmEofNkjlEw3oZrA2NMKYOOYc-YwBQ65yLoDAo9_hpVUDCmkdzvnqDeN7LbvX73g44lTGZuaR8j6SmGUZpyPLcSMYJHkM_5RcQYYZsTroVqWqwFLQKL5XwvsVzsLPVm7Lcfuu3bft7d76QKfT9xud_f283X6DYYhnnEyhC6nMuFwlr0XGDjgO8Y8aCgcKJgtQh4pJCRaUUXNp1SPdnDBEc9Fs3end5e1wsF_ehC2XbAlDsZCo5dmtLzfVrkq4GGC_dOMvwidtMrpHUSLlIyLaFd7vZrmJdxuOozo9xTHADTKpaJj9UrUjh9RAdlnHpx7hJuXid94Bv3Pe6_7Pn4EDOf55Bf68Ar_4Cnzuivf-6xWPKw5XvHN0xZNO5_UZ2P8Cfv-Be2TFVzP_iTue6vtZ2zzjGnmVlDUUXOmgNP3C7nDcTZbvBYEfBAGREFMF_PeUhWRNoBOuzEPTF6fXq59euxq_yrjT9bsXQXCxb_zWFntqb2wJlMa_XimMqo5QKWYVa8WyrHBb0Zjq_qPgdQXfDQzSGJlDNCbQgq1g8IC2kMXbkXz5FwAA__8.j4pvYe1duHl9kZDkE7A64uBKZlKZLwDs89gQR9RPQPY",
    "requiredFields": {
        "contactPerson": [
            "EMAIL",
            "FIRST_NAME",
            "TITLE",
            "PHONE",
            "LAST_NAME"
        ],
        "otherPersons": [
            "FIRST_NAME",
            "TITLE",
            "LAST_NAME"
        ]
    },
    "maxPersonNameLength": 28,
    "services": [
        {
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:20PMICIAIBFAKE-11114ECONOMY",
                    "departure": "PMI",
                    "arrival": "CIA",
                    "departureTime": "2023-06-26 12:20:00",
                    "arrivalTime": "2023-06-26 14:50:00",
                    "duration": 150,
                    "fareRules": [
                        {
                            "category": "FAKE CATEGORY1",
                            "description": "Fake fare rule description1"
                        },
                        {
                            "category": "FAKE CATEGORY2",
                            "description": "Fake fare rule description2"
                        },
                        {
                            "category": "FAKE CATEGORY3",
                            "description": "Fake fare rule description3"
                        },
                        {
                            "category": "FAKE CATEGORY4",
                            "description": "Fake fare rule description4"
                        },
                        {
                            "category": "FAKE CATEGORY5",
                            "description": "Fake fare rule description5"
                        }
                    ],
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "PMI",
                            "arrival": "CIA",
                            "departureDateTime": "2023-06-26 12:20:00",
                            "arrivalDateTime": "2023-06-26 14:50:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11114",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-08",
                    "amount": {
                        "amount": 140.36,
                        "currency": "EUR"
                    }
                }
            ]
        },
        {
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:10ROMPMIIBFAKE-111120ECONOMY",
                    "departure": "ROM",
                    "arrival": "PMI",
                    "departureTime": "2023-06-30 12:10:00",
                    "arrivalTime": "2023-06-30 14:20:00",
                    "duration": 130,
                    "fareRules": [
                        {
                            "category": "FAKE CATEGORY1",
                            "description": "Fake fare rule description1"
                        },
                        {
                            "category": "FAKE CATEGORY2",
                            "description": "Fake fare rule description2"
                        },
                        {
                            "category": "FAKE CATEGORY3",
                            "description": "Fake fare rule description3"
                        },
                        {
                            "category": "FAKE CATEGORY4",
                            "description": "Fake fare rule description4"
                        },
                        {
                            "category": "FAKE CATEGORY5",
                            "description": "Fake fare rule description5"
                        }
                    ],
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "ROM",
                            "arrival": "PMI",
                            "departureDateTime": "2023-06-30 12:10:00",
                            "arrivalDateTime": "2023-06-30 14:20:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111120",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-08",
                    "amount": {
                        "amount": 57.27,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "extraBaggageOptions": [
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jkFrAjEUhP9KmXNaNkt7yc0uKwS1iuBBioew-zZN1Rf7NmkV8b83FjrXmfn4rvjKjlNIFxit8EPBfyQY1C8Pew8FprSS0BHMFe4YM5dSV0-VQpdFiLvyQ7tZ46Yg_9PBHUZS-IxZmC5rGui-pBHmHbo2dbVa2MZO7Ot0Mmsfdclz2yzflostdgonkjGy5Z7Of04nid-hJ2liX9iYZ--dJ13kEp2T5SHK0aUQ-c7f3X4BAAD__w.yUZesvZDZR-ux4hFsb5Pu-zpVpKc4mRcayKLzd-rtD0",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 1,
            "weight": "25 kg",
            "price": {
                "amount": 10.42,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jk9rAjEUxL9KmXMqbqiX3OyyQrBWETyU4iHsvo3R-lLfJv5B_O6Nh85tmN8Mc8cpO04h3WC0woWC3yUY6MnLwUOBKa0ktARzhzvGzCXU49FYoc0ixG3podms8VCQf7R3PwMp7GMWptuaenqSNMB8o9Klv1rY2k7t-2w6b16roremXn4uF1_YKvySDJEtd3SFqYqXeA4dSR27so2P7L3zpMu5RNdkuY9ydClEfu5vH38AAAD__w.rF5CVdku-fA8VPtOLB2Erm_KEsAJs3wUIT1fNd4XQKg",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 2,
            "weight": "25 kg",
            "price": {
                "amount": 20.83,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jk9rAjEUxL-KzDmV_dNectNlhdBaRehBioew-zbG1pf2bWIV8bsbD53bML8Z5orfZDn6eIGuFf7Iu32ERvUy-XJQYIpr8R1BX2GPIXEO62JaKHRJhLjLPbQfG9wU5B8d7PdICoeQhOmyoYEeJI3QnygrXRXrpWnMzMwXs9f2qcx6bpvV-2q5xU7hh2QMbLinM3SZvYST70ma0OdtvCXnrKM6n4t0joaHIEcbfeDH_u52BwAA__8.KHixTY54M2c5kq-yoj5FcVHgpcbtpAp6cLwREOMD3l8",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 3,
            "weight": "25 kg",
            "price": {
                "amount": 31.25,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jjFrwzAUhP9KuVkptnEXbY5xQTRpgqFDCRmE_ayqSZ7aZ6lNCPnvVYbedtx3x13xnSxHHy_QtcIvefcRoVE9PRwcFJjiVvxA0FfYU0icw7p4LBSGJEI85B66tx43BflHJ3ucSeEzJGG69DTRnaQZeoey0lWxXZvWNGb53Lx0izKr7trN62b9jr3CF8kc2PBIZ-gyewk_fiRpw5i3sUrOWUd1PhfpHA1PQU42-sD3_f3tDwAA__8.M4ytA9HSmJYi6djksn9EHjgLMctmqxSgKgh9orFe16g",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 4,
            "weight": "25 kg",
            "price": {
                "amount": 41.67,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jkFrAjEUhP9KmXMsm0UvudllhWCtIvRQioew-zZG60t9m7SK-N8bD53bMN8Mc8M5O04hXWG0wi8Fv08wqGdPRw8FprSR0BHMDe4UM5dQV8-VQpdFiLvSQ_u-xV1B_tHBfY2kcIhZmK5bGuhB0gjzCV2butqsbGPn9mUxX7YTXTRtm_XbevWBncI3yRjZck8XmLp4iT-hJ2liX7bxmr13nnQ5l-iSLA9RTi6FyI_93f0PAAD__w.4IfYofMg4cMNbH1HeUiC32s_m6re-o-337kjMavlrY0",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 1,
            "weight": "25 kg",
            "price": {
                "amount": 10.42,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jsuKAjEURH9Fap0ZNMxseqdNC0EdRXAh4iJ0385k1BvnduID8d-NgrWtU4e64T9Zjj5eUWiFM3n3G1FAf_d2DgpMcSG-JhQ32ENInEvd_-wr1EmEuM47VKsl7gryRlu770jhLyRhui6ppSdJHYoNBjrvFzNTmqEZjYeT6mOQ81WV85_5bI2twpGkC2y4ocvr01HCyTckZWiyG9PknHWk87lIl2i4DXKw0Qd--rf3BwAAAP__.03HM9aNPXQ6drOuU4AFSUNIAsIEEwgczvQzFfvofjfU",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 2,
            "weight": "25 kg",
            "price": {
                "amount": 20.83,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0js1uwjAQhF-lmrNBIaEX32gUJAsoCKmHquJgJRtjftbtxqYgxLvXHDq30Xwzmjt-kuXo4w26Uvgl7_YRGuXry9FBgSluxLcEfYc9h8Q5rIpxodAmEeI299B8bPFQkH-0t6eBFA4hCdNtSz09SRqgvzApdVlsVqY2M_M2ny2a0SRr2tTr9_XqEzuFb5IhsOGOrtBl9hIuviOpQ5e3sUzOWUdVPhfpGg33Qc42-sDP_d3jDwAA__8.-bedIoAM3EPTr_v8eNdfl0xTJpqklU_kKwWULJzi8cc",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 3,
            "weight": "25 kg",
            "price": {
                "amount": 31.25,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0js1uwjAQhF-lmrOpQhQuvtEoSFb5ExKHquJgJRvjtlnDxi4gxLvXHDq30XwzmjvOyXL08QZdKVzIu2OERjl7-XZQYIpb8S1B32GHkDiHVfFaKLRJhLjNPTT7HR4K8o_29mckha-QhOm2o56eJI3Qn5iWuiy2K1ObuXlbzN-byTSraurNerP6wEHhRDIGNtzRFbrMXsKv70jq0OVtLJNz1lGVz0W6RsN9kMFGH_i5f3j8AQAA__8.o29WCMxp5IZDAkFPdsgy88i_IBHlvUGcDUHmuOHEmFw",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:20PMICIAIBFAKE-11114ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 4,
            "weight": "25 kg",
            "price": {
                "amount": 41.67,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jkFrwkAUhP9KmfNWsgEvuamkEGwaCfQgxcOSvKxr9a2-7FpF_O9dBec6883MDadoOLhwRaEV_sjZbUCBfPr2a6HAFFbiOkJxgzn4yMnU2SRT6KIIcZc4lN8t7gryig5mP5LCzkdhurY00CNJI4of6DzxbVOv6qqaf8yW5btOyrNy0Xw19RobhSPJ6Lnini7PU0fxZ9eTLHyfyvEZrTWWdHoX6BIqHrwcTHCeHwOb-z8AAAD__w.U4yvcJ6qwUC-PaH7F-FEnI8CbL8aA7OjPYDL0FspWSY",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 1,
            "weight": "25 kg",
            "price": {
                "amount": 10.42,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0TstqwzAQ_JUyZ7XYgl50a4ILJnEdDDmEkIOw14qSZtWupTwI-fcqh85tmOcdv8ly9PEGoxUu5N0-wkC_vxwdFJjiSnxPMHfYU0icRV28FQp9EiHucw7VusNDQf6to_2eSOEQkjDdOhrp6aQJZotSm7Lo2mbV1PXs82NRvZYZuqjm7VfbbLBT-CGZAtc80BWmzFzC2Q8k8zDkciyTc9aRzu8iXWPNY5CTjT7wc2D3-AMAAP__.a-R00d49NZsjnV-yqlImtIsc6ObKivCiP031MNVVnXM",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 2,
            "weight": "25 kg",
            "price": {
                "amount": 20.83,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0TstqwzAQ_JUyZzX4QS-6tcEBk7gOhh5KyUHYa1VNsmrWUmsT8u9VDp3bMM8rLtFwcGGBLhV-ydnPAI3i6eFoocAU9uJ6gr7CnH3kJJbZKlPoowhxn3Ko3jrcFOTfOprTRApfPgrT0tFIdydN0B_IC51nXdvsm7p-2Txvq8c8ociqdfvaNu84KHyTTJ5rHmiGzhMX_-MGkrUfUjl20VpjqUzvAs2h5tHL2QTn-T5wuP0BAAD__w.MrGp7Yorr3aLnux8QMUK7RQlXRAYPFAEDB_ULzpPIsk",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 3,
            "weight": "25 kg",
            "price": {
                "amount": 31.25,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0Tj1PwzAU_CvoZlMlUVi8QZVKURtSRWJAqIOVvBjT9pm-2JCo6n_HHbjtdJ9XXKLh4MICXSr8krOfARrF08PRQoEp7MX1BH2FOfvISSyzVabQRxHiPuVQvXW4Kci_dTSniRS-fBSmpaOR7k6aoD-QFzrPurbZN3X9snneVo95QpFV6_a1bd5xUPgmmTzXPNAMnScu_scNJGs_pHLsorXGUpneBZpDzaOXswnO833gcPsDAAD__w.hx7p_R8A00F6gkw8J8_tqiSkUbeJKuSs41k1Cl2QFKU",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 1,
            "quantity": 4,
            "weight": "25 kg",
            "price": {
                "amount": 41.67,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0TstqwzAQ_JUyZ7VYhl50a4ILJnEdDDmEkIOw14qSZtWupTwI-fcqh85tmOcdv8ly9PEGoxUu5N0-wqB8fzk6KDDFlfieYO6wp5A4i7p4KxT6JELc5xyqdYeHgvxbR_s9kcIhJGG6dTTS00kTzBa6zPmubVZNXc8-PxbVq84oi2refrXNBjuFH5IpcM0DXWHKzCWc_UAyD0MuxzI5Zx3p_C7SNdY8BjnZ6AM_B3aPPwAAAP__.berJoTYO-8ZJpu9Muk4ZPdb-JAuiXUkCDeY6r0QXfDs",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 1,
            "weight": "25 kg",
            "price": {
                "amount": 10.42,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0js1qwkAUhV9FznpakoFuZlclQmjTSKALERdDcjNOW-_Ym5lWEd_dUfBsz3d-zvhNlqOPJxit8E_e7SIM9Mvs20GBKa7E9wRzht2HxNnUxXOh0CcR4j7nUH12uCjIAx3tz0QKXyEJ06mjkW4kTTAblNqURdc2q6au58vXt-qpzNJFtWg_2maNrcKBZApc80DH-6mDhD8_kCzCkMvxnpyzjnR-F-kYax6D7G30gW8D28sVAAD__w.JkqQQWMjQYnyP_NjEQfrEbeRZmmy3OqXd1TE0Ui_9ws",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 2,
            "weight": "25 kg",
            "price": {
                "amount": 20.83,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0TsluwjAU_JVqzm6VRb34BihIEU2DInFAiIOVvLgu5bl9sVmE-HfMoXMbzXrDXzQcXLhClwpncvYrQKN4fzlYKDCFtbieoG8wRx85iWX2lin0UYS4TzlUmw53Bfm3juZnIoVvH4Xp2tFITydN0Dvkhc6zrm3WTV3Pl7NV9ZonFFm1aD_bZou9wi_J5LnmgS7QReLiT24gWfghleMjWmssleldoEuoefRyNMF5fg7s7w8AAAD__w.dnD3I_Mz54lUc-KzajH3qXlRo68i0LHFdqSBP7hsCbM",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 3,
            "weight": "25 kg",
            "price": {
                "amount": 31.25,
                "currency": "EUR"
            }
        },
        {
            "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0TstuwjAQ_JVqzm6VROnFN0BBimgaFIkDQhysZOO6lHW7sXkI8e-YQ-c2mucNf9FwcOEKXSqcydmvAI3i_eVgocAU1uJ6gr7BHH3kJJbZW6bQRxHiPuVQbTrcFeTfOpqfiRS-fRSma0cjPZ00Qe-QFzrPurZZN3U9X85W1WueUGTVov1smy32Cr8kk-eaB7pAF4mLP7mBZOGHVI6PaK2xVKZ3gS6h5tHL0QTn-Tmwvz8AAAD__w.kFy4hWfji_MS4BGX1iXd7XCN3ZcS6lmnKJedoPCOP1I",
            "roundTripPrice": false,
            "journeyReferences": [
                "12:10ROMPMIIBFAKE-111120ECONOMY"
            ],
            "personIndex": 2,
            "quantity": 4,
            "weight": "25 kg",
            "price": {
                "amount": 41.67,
                "currency": "EUR"
            }
        }
    ]
}
```

This operation creates a pre-reservation of the selected transport. Some considerations:

\- The required data of the required guests, indicated in the response of the [Confirm](#confirmtransport) operation, must be sent.

\- At the end of the trip the passengers must follow the same order than the one indicated in the [Quote transport](#quotetransport) operation, the age for children and infants must also be the same.

\- The recommendationKey returned in the [Confirm](#confirmtransport) operation response, must be sent

\- Extra baggage must also be indicated on this operation

```
{
    "transports": {
        "extraBaggage": [
            {
                "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0jkFrAjEUhP-KzDktRvGS23bdwqLWIngoxUPYfZtG64u-Taoi_vdGwbnOzMd3xTFZjj5eYLTCibz7iTAYTQY7BwWm-Cm-IZgr7D4kzqUevg4VmiRC3OQfqvUKNwV5Tjv725PCNiRhuqyoo_uSephv6JHRk0UxLeuifnsvZtWLzhlX5fJjufjCRuFA0geuuaXzw-kg4c-3JGVoMxvz5Jx1pLNcpHOsuQuyt9EHvvM3t38AAAD__w.S05H83V5x8ntPbfRcqcHhJ5tEK3Bk8Jwn6TBNWL2-Qc"
            },
            {
                "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0js1uwjAQhF-lmrOLcCouvqVpkKJCQUg9VIiDlWyMoazpxuZHiHevOTC30Xwzmhv-kuXo4xVGK5zJu22EQTF52TsoMMWl-JZgbrCHkDiHejwaK7RJhLjNPdTfK9wV5In29ncghV1IwnRdUU8PkgaYNXRh9GReflRN2bxPy8_6VWe91dXiazH_wUbhSDIEbrijC0yRvYST70iq0OVtzJJz1pHO5yJdYsN9kIONPvBjf3P_BwAA__8.Tltv6rIQ_IVIKEYj2ywjEnudqrh4aHexRgFu4WIvw3w"
            },
            {
                "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0js1OwzAQhF8FzdlUcQQX30pJpaikQZE4oKoHK9kYU7ouGxtaVX33ukjMdb75OeM7WY4-nmC0wi959xFhUD7e7RwUmOKr-J5gzrD7kDibupgVCn0SIe5zDtVbh4uC_KOj_ZpI4TMkYTp1NNKNpAlmA12asujappk_10_L-aq611kPRbVo123zjq3CgWQKXPNAx79TBwk_fiBZhCGX4yU5Zx3p_C7SMdY8Btnb6APfBraXKwAAAP__.RqaUl_ZfgMJl11S3TsFHCeibC-tNZN4qeezCynn8C5w"
            },
            {
                "optionKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNo0TstOwzAQ_JVqzi6Ko3LxrbSpFJUQFIkDQj1YycaY0jVs7D5U9d9xD8xtNM8rfpPl6OMFRiucyLvPCIPycbZ3UGCKr-J7grnCHkLiLOrioVDokwhxn3Oo3jrcFOTfOtrviRS-QhKmS0cj3Z00wXxAl6YsurZpluv6abPcVnOdsSiqVfvSNu_YKfyQTIFrHugMU2Yu4egHklUYcjmek3PWkc7vIp1jzWOQg40-8H1gd_sDAAD__w.XRlWM17fBAt3AJDtnXH8w77FbQCYwdwC3CyieasY5FU"
            }
        ],
        "recommendationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNrsV0tv2zgQ_iuGznZBSZZb66bYSiA0fkB2DsGiWFDSWGEjkypJpTWC_PcdSnLsxI9udoHm0OYUct4z33y0Hi2lobR8azSbXkbxJBxbXYs-UFbQhBVMb6LM8j132LW-ikpy2CjL_-vRyqCkUlcSxlQDWjvEcXtk0HMGaP4sRMEkGO_fLDeluR2Hi2U0DZbRbGrCSckeaIH38SzcnY_oPnVPh3bJq9CNs38bukn0TOgvXUtUOhEVx448WqUUDywDORJ8xfJKUs0EN81ynE9O1-Kg55KlYFTpGo205X_sf7C9rpVWUgJPNxggvImxJqM8Eus1Uwp90KSAA1PygRwz1PQHqANl57jyNuMYVmBEpsLL4HPYs4f9T313MPzoYQdSipKiqMuZi4KlDNqR77fb65GhaVcb8ac1mu6lgmtJUz0RGd0iCxOVoDArrsdMpcbHJTXTW9FCQdda4SGuijaFFFPIhdy0iXdGwTK8msW3dj1nlUpWmrSNmN5Dxxh3JFp39oR2DaJTnpw3eHLOenLf4Mk966n_Bk_9s568N3jyGsRz-E43LcK0rHAkhfieCqWfR0TTemwjkdVT-mImuqbyvj0kVIEZaVADZA5yTpUCnoNs5AVVesnSe9CM5-OXGLPNOLawXVRlWTBjVhf19-JmPr-OwhhVpFlKjYkvgMr0bpupeDDrud2rLYwwJm44QzhjwIDJgnEwyaPf6MJqEgoMAS7Z-kUypEOGPnF9twZJu_G4bQTxTrOMmSMtkA80gjyGbxWTkGFFtAm6U6k7kHOzia-V8H6Nu_Azku3Yjm97PiE7yjqi4_l90ugcMvKO-EZRgGfcTK5KIfW0WifPTe7Z-GeQbAYKJxomSpCnmmkKLE1F7aXVrHR7whDtRUu485uL62h02N6E5jnNIeIrgVou6Xy-qqkqYXyE81KtvxAfsdnkFkWJEPeY0b7wdr_KbbzrYBo25UmGAa4QSWWL7Kd6HAWkGrKLJr6ZERIp4__nFbAHv8EzcKrIP-_An3fgP74D70ry9pD8YpJHkkOSd8g5kjc6nu8eIfl4Njny6_YMyffJu7J83d_34vOMKcRVUjWpIKmDVOY_nA7LTLuHrtPv1x2SWCrgF1MWGGsXk06Y1HftXOzhsHl8Sb1-rbHneIPB4ND4pS3OlGxtTVIKP7dSmNQTMa1Y1KjleVXnbYXm6wV-lKzp4OuFQWCQGsYmLqdrGN2hLWTxbiWf_gEAAP__.9QVn04kHScPPsB5XgM6WMK7txMh_o3tJl53PByARsL8"
    },
    "persons": [
        {
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "lastName": "Test",
            "name": "Test",
            "phone": "911111111",
            "phoneCountryCode": "+34",
            "requestedAge": 30
        },
        {
            "birthDate": "2020-01-30",
            "courtesyTitle": "MISTER",
            "lastName": "Test",
            "name": "Child",
            "requestedAge": 3
        }
    ]
}
```

**Prebook - Response**

Prebook - Round trip - response

```
{
    "auditData": {
        "timestamp": "2023-05-09 09:43:03",
        "processTime": 13,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM2MjYxNDQsImp0aSI6IkJBOUUwQjgyLUU2RjMtNEUwMy1CMTcyLTEwNTRDMjFDNzQ0QiJ9.SLU0EirYA9j4b3okiWFNOyhf3HIcAjRFOBhqsZYa-3HWLKh6GVLmTK2hJtRIDvap_3QNcOYGfumlY50pTVdTnQ",
        "traceId": "BA9E0B82-E6F3-4E03-B172-1054C21C744B",
        "availabilityId": 658,
        "server": "http://production-tomee-server-1.travelc.internal:30047"
    },
    "priceBreakdown": {
        "totalPrice": {
            "amount": 84.69,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "recommendationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNrsV0lv4kgU_ivI14HIC9DEpzHEHaEEsAw5RK1Wq2w_oCamylMup5uO8t_nPdssCUsPmsOMNMkhStXbvrd95bwYuYbMcI0g9PuTyZ1_YzQN9sx4yiKecr0eJobb7fSaxh-yUALWueF-eTESyJjShYIbpgGtbdN2Wma3ZXfRfCskt6Ph_s1sndHtLPTG02ASzr71valPEZXizyxFUTgZ7c7H1V-bpwE45jsAlb8LAFSIzwP42jRkoSNZCKzOi5Ep-cwTUAMp5nxRKKa5FFQ42-7ZTUOADhSPgVTZCo204fY6V10salwoBSJeYwz_IcTMSHkgVyue5-iDRSkcmJpX5jFDzX5AfqBsH1feIA5hDiSiJD97d36r1zN7XavzqY01iBkK0rTMJpApjznU3d-veadl9qhgdcC9FK0r5zA21S6WQisW65FM2GbGEKaCHDEJfcPzmFx8ZtTBOUtzaBpzPIRFWiOIEcFCqnUNuzHwZv7tJHy0yl7nseIZoSYxe4IGGTcUWjf2hFY5SKc82Rd4ss96ci7w5Jz11L7AU_usp84FnjrVvAv4ztb1fNU9SeX3WOZ6e2Zx2beBTMo2faWWrph6qg8Ry4F66pUDEoAKWJ6DWICq5CnL9YzHT6C5WNy8nTGLOruZ2mmRZSknszKrb9OHILgf-iGqKNpJjcinwFS83EKTz7Sem73aDBIGxSXnOM8Y0eMq5QIIPToe9o0KkUdkOOOrNxN_3TCv3bbtlqOf1BtvuJbTwSokCacjS5EPNI55CH8WXEGCKbEq6E6lLMFC0Ca-V8L7FW7Drwi3YSGMjmuaO9Y6otN2bbPSOWTnHfcNhh6ecTdFnkmlx8Uq2lYZW2CVXaCOwomCyQzUqWJSghllVF8a1VLXJwxRX9ScGzz074eDw_JGbLFgCxiKuUQtx2zc3ZZcFXExwH7ltT9_MBlPRo8oiqR8QkT7wsf9LDfx7r2xX6WnOAa4xVHK6vl5LduRQqwh6VfxqUdIpFz8o1fgKEV-PAIfj8DHI3DqEfi_MTwyHDI8kfxphicdZPhPhwz_5nN6y_jnGP4_QPH_FpknPMfBiooKCjI6qJz-wu4IVo6HJ7QUXNaDM64up0iRS_hJs4kFAPyHKvHIp4N0FnGll3W3rOvr6j2mJuGSKA35esZ1SsLRcDorv2BwWTh1CoX6d_p1FcsVffwsJRUbl0at68x_c9obAZ66m59y6WvAASTq78J9ixZny2yZdsvunUb7SlXLURbDqBwZ6tW0DCcWRVlYwx9TUj8yXrX43Urjnlmm23ZckxiSQA-WaAtJuCON178AAAD__w.fhFj7Hd-s_D4A8W4mKlha1l7BzpzeH82ROSYC7_LrNI",
    "services": [
        {
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:05PMICIAIBFAKE-11111ECONOMY",
                    "departure": "PMI",
                    "arrival": "CIA",
                    "departureTime": "2023-06-26 12:05:00",
                    "arrivalTime": "2023-06-26 14:20:00",
                    "duration": 135,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "PMI",
                            "arrival": "CIA",
                            "departureDateTime": "2023-06-26 12:05:00",
                            "arrivalDateTime": "2023-06-26 14:20:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11111",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                },
                {
                    "ref": "12:12ROMPMIIBFAKE-111111ECONOMY",
                    "departure": "ROM",
                    "arrival": "PMI",
                    "departureTime": "2023-06-30 12:12:00",
                    "arrivalTime": "2023-06-30 14:27:00",
                    "duration": 135,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "ROM",
                            "arrival": "PMI",
                            "departureDateTime": "2023-06-30 12:12:00",
                            "arrivalDateTime": "2023-06-30 14:27:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111111",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-08",
                    "amount": {
                        "amount": 84.69,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-06-20",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        },
        {
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-02-28",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

Prebook - Round trip with two oneways and selected baggage - Response

```
{
    "auditData": {
        "timestamp": "2023-05-10 09:03:48",
        "processTime": 63,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MTI0ODUsImp0aSI6IjE0RTU0NjczLURGMTctNEU2Qi1CMTNFLTNCOEQyQkQ2RUQyQiJ9.KWHJYCbj25rd-s9slre1YAq32RBCw7DSvBKgkubpB5CTncq4LTFWqjpfIyOAdRbxk1XN72nmk6M--zRqWx9sFw",
        "traceId": "14E54673-DF17-4E6B-B13E-3B8D2BD6ED2B",
        "availabilityId": 539,
        "server": "http://localhost:30000"
    },
    "priceBreakdown": {
        "totalPrice": {
            "amount": 289.89,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "recommendationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNrsWFtv6kYQ_itoXwuRL5AGP5WAT4SSAALyEFVH1WJPzDZm12e9zgmK8t87s15CLsA5aaVGasNDlPXMznxz-8bwwEoDBYvYZBqfjsfn8YA1Gb_jIucLkQuzHqYs6oTdJvtTVVrCumTR7w8shYJrU2kYcAN4O_CCsOUdt4JjvP4kRMFlb_D8yXxd0NNBPJsPR735cDwid1qLO57j8-k43p536D4297sOvVeua2M_67oGesD11yZTlVmoSmJGHlih1Z1IQfeVvBFZpbkRSlKyguAkaDIJZqJFAqTKV3jJsKjbPvI7TZZUWoNM1uggvppiTKTcV6uVKEu0wRc5vLnqHXm7Lhp-D-Ub5WC38gbxFG6ARBThl9553PK77ZN2eNz9tYMZSDhK8tyGM1G5SAS4kj9Pd6fldSldzuMPY6TsJUoazRNzqVK-6SwEqqFEVNIMRJmQjS-cqnfD8xKa7AYP0yp3EBKEkCm9dsAb_d48PhtPr31b5zLRoiDYJOa30KDLDY23G8-Evm2ifZaCd1gKDloK32EpPGip_Q5L7YOWOu-w1Kk7XsJ3vnYdZnSFJcnV90SV5qlEPLFl66vUVukrVXTF9a07LHgJVNKebZAJ6AkvS5AZ6Fqe89LMRXILRshs8LLHfCrHpm1nVVHkgq7ZoP6YXU0mF8N4iiqahtIg8BlwnSw3SNUdjedmrjZthD5xwgW2MzrsCZ0LCQQe7Q5PWQ2oRwQ4F6sXYLyG1428MAptk7iJx2nzsN95mgo68hz5wGCTT-FbJTSkGBGvnW5VbAYySZP4Wgmfr3AWfkSyDT-I_E7keVvK2qHTidperfOWkbfE1x_28IyTKctCaTOqVounJLd8_FAnU0FhT8JUAXpfMinAgiJyD1k90u6ELtwDR7iTq9OLYf9tehc8y3gGQ3mjUCv0GudnlqoWQvaxXqWzF_fHo_HlNYoWSt0ioufC6-dRbvxd9EZxHZ4W6OAMO6lwnf1oy5FDYiA9rf3bqnyruDRIXyzym-w7iGxpKO-dxm3GdvO-v4e99UbVTZLbsE_87LoV01viapEp3Fuf281j47qoLDbiQAP3hnKkVzZ59j7xwcdCDt4NGUEzIf_JqvVP_ge7dl-Qn8v2c9n-zWX7oZvU73r_8ibFTYKbNPAObVLS6UThjk06HV_u-ApxYJO2vQ9dpTa_n0vzP7w0U1Hi8C6qut4PzqStgOR2BueAbFKP5ujFE439hf9B2qOShRjIQmizdMPgd7v1ayV1MFKQNlCu58Lk9o1yOJvb93CkIkGDgELzG_05StSKXuGXinoZk6TXLppfwvZGgKeu7z6WUR3U_lLk6c9gfQkV59ZreX79e8AeqDZZJcoSuLTjSMWaWV8yq2zTsph-H4D7QtTj85otkRU84rD2CXUDwusv8S6k0y0fP_4FAAD__w.pBvqaD-b9U7hw6kPjm3BUqkU9WE28yjysBxGumGrMY4",
    "services": [
        {
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:15MADCIAIBFAKE-11113ECONOMY",
                    "departure": "MAD",
                    "arrival": "CIA",
                    "departureTime": "2023-06-26 12:15:00",
                    "arrivalTime": "2023-06-26 15:40:00",
                    "duration": 205,
                    "selectedBaggage": [
                        {
                            "roundTripPrice": false,
                            "personIndex": 1,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        },
                        {
                            "roundTripPrice": false,
                            "personIndex": 2,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        }
                    ],
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "CIA",
                            "departureDateTime": "2023-06-26 12:15:00",
                            "arrivalDateTime": "2023-06-26 15:40:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11113",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 98.07,
                        "currency": "EUR"
                    }
                }
            ]
        },
        {
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:20ROMMADIBFAKE-111140ECONOMY",
                    "departure": "ROM",
                    "arrival": "MAD",
                    "departureTime": "2023-06-30 12:20:00",
                    "arrivalTime": "2023-06-30 15:30:00",
                    "duration": 190,
                    "selectedBaggage": [
                        {
                            "roundTripPrice": false,
                            "personIndex": 1,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        },
                        {
                            "roundTripPrice": false,
                            "personIndex": 2,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        }
                    ],
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "ROM",
                            "arrival": "MAD",
                            "departureDateTime": "2023-06-30 12:20:00",
                            "arrivalDateTime": "2023-06-30 15:30:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111140",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 191.82,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-06-20",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "911111111"
        },
        {
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-01-30",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

Prebook - Round trip with fare Families - Response

```
{
    "auditData": {
        "timestamp": "2025-10-09 12:45:10",
        "processTime": 788,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE3NjAwMjA0OTMsImp0aSI6IkM3QURENDgwLTgxNUItNEQ5Ri1CQUMwLTI2OTUxNjU4MTkxMCJ9.PolK7LrGQy5Zb766hssYACLX3_OES_cLucGXoU7NuuF617m3SDq4Oe9ndKOaDeSegHYyRql2ECR1VDFMXnhyHw",
        "traceId": "C7ADD480-815B-4D9F-BAC0-269516581910",
        "availabilityId": 964,
        "server": "http://localhost:30000"
    },
    "priceBreakdown": {
        "totalPrice": {
            "amount": 941.1,
            "currency": "EUR"
        }
    },
    "recommendationKey": "eyJ6aXAiOiJERUYiLCJhbGciOiJIUzI1NiJ9.eJztWmlvo0gQ_SsWX9exwBhfnxZfG2t9yZDVHIpGbeg4vYNppmkya0X571uFwSee-JisZnaIosQN1VXVVe91w0uelVDSQGkqk2m3NR7_2e0oRYU8EeaRGfOYXPZdpdmoVorK3zwSPl2GSvPjs-LSgAgZCdohksLsslo2bjTtplyF6eubcKPVHm1fsZcBXrWn5siajKf2p5ZpdTGiEOyJeHBraHY242zzl-LxBHR1L4GVvzMSWGX87QTuiwqP5IxHPlTnWQkEf2IuFW3uP7B5JIhk3MfCGWpVLyo-lRPBHIqmZAGTpNJUS2pRcSIhqO8sIUL3bgrrQtM2XyxYGIIHMvPoqRPTFKb0geItzFozYCEOgYHnxSlNuMccRpMWbhdOvVHruOokyCZcQ9VLlephRCyBw30piCOH3CUpVCA5QUPIxJcdFjropEewEQ_EC2lReYDBNPLiHO630oZyMn-OHhQNEuE-_UqWyeKTqR7_6vBQrsfEid23uZt6E3RBxOdkMCMhxdBmvJIJFRMShtSfUxEvP0hHOB-imh1b2UzaLkFFz6w5onDfSfv2iA-9Ucn0AXl6JJQ2cz5TLEBntykaolkgzKRggUWJcB7X6-dPGDcFy1ZRAbcMugvuTCY85tMku7t3yiqcify22WKn_42CVm7q9aZeQ74kIEYAQKVdl-GIeIBwCR2f0i8RE9SFdAnEVCa34xGyyO7bA_zd608t-9PIHOJgYG4-d4dmf6Dcb7uM2zL3Ebq7Tl9xBk5g3gKA9tqWVNA0YGJTVTe8zrDRm-XE5nD_2t-eAPZ-GHAhR9FihoBSajUVtz7EHz1SeR5QcawruPQA15JcrNWxC0iW5MK48_599za5luxKk7vWoN8-6NaMzOdkTvv-A8clTtrxLjBjfht6Hyb-WndWf9S1LMQr558hq-274-01ptEGZtzjBRYD_P8BuAzWYJTUefSZQzxL8iD8a4xIfIlb5FFHUre1SmoFUFxDjyzgfEn2ImcVdtC3MYJPFtujjN1Tq2XvSqdsoNlMhBVwCWBMrRfMETxkcjdsXS1VG1mTV73l4hTrF6yKeIJAoRVQhz1A2bB7IU6OoQqgA5zdvYtBtXW-HGzuGXvHR8R0UVPh-x4iaUZTU8EZuIz96Uf96Sf4e9lw7sTUM8A1UvYxqmZjtNsej8bD97tEGAERjIFybGkZ8T5cFe9DEg8CMt_xIpe6MWQZPhetsaoVbonvFlKUv9zj6ZCg2rLNUcecdjbI3r6Sge5yxbgY3Vq1ejG8y4ZxBryPWefw3oebdia8u93r4H1OvA9JvPPgXVwZ1Iy1RY-JUBacRwrVdQuzLB70Bt13Gw6kowz86_XL8a-rl-O_omolo3wq_o9Z5_i_Fv_G7X-Lf4z3RvhPDLXK2rD9SOCFISyYHrzPQLDUpLo5HSiRBSt-bsJnurWPTTCAMRfwwlVocSJcqMcu0eDZLj5hNmRLn_YKr5w81Vr5YuYZDf1i5tVUtVSpn8q8Y9a_OvPGB0x4_eF__xXjrKOnc13AztuePalhbYs38GbHDk2u5F5iVK5vXl0AqHNaMB2AYojk3HoT6qUvP0us6oayu8fjmrHfOCePaTOnsLVevvw1qFHRStqpZD1inHP1eq6edUx-D66--Tl5Alff_ig9gc5F5UsEPAFi9XakjEQMwfKbvtsPw4ha4MJGKYWsckht1tLhkATQslVhr1GUr9kNzhGV9Z9SVC7novIPJCrXjZ9cVNbVQrzxfktURptqUzcOReWdv3EpqcicKSrr31VUbmRu6q-Jytit7yAq7wjnuaici8q5qJyLyrmonIvKuaici8q5qJyLyrmo_AMyLxeVc1E5F5V_Ha7movL_S1R2WSgFm0UrO0AoFSF-gjInidg0lAlCRztXBP0SwSfqmqix6PivhUzIx0Tm0hoN_UbVbnT8f12HR0LScGkz6cUKV9-yu1PUoBaEocQFN-Xv-KPk8AVcDx45ilXAZrFM0PCbXklvwKiafsW1WzeHee4pue6mCkQrv5Zq3IAQ7jl0GOttuKlYcSx_HsUqk9LFx1D6T8BWytieropip96sIHWSLXeFJXe6UZBf_gWmBBDf.dCvam_wUtTDvornEibMRX_gr1AeM-CrDgSlbAAaZqbc",
    "services": [
        {
            "provider": "Amadeus",
            "journeys": [
                {
                    "ref": "11:50BCNMADUX7706BUSINESS",
                    "departure": "BCN",
                    "arrival": "MAD",
                    "departureTime": "2025-11-26 11:50:00",
                    "arrivalTime": "2025-11-26 13:20:00",
                    "duration": 90,
                    "fare": "BUSINESS FLEX",
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "BCN",
                            "arrival": "MAD",
                            "departureDateTime": "2025-11-26 11:50:00",
                            "arrivalDateTime": "2025-11-26 13:20:00",
                            "marketingCompany": "UX",
                            "operatingCompany": "UX",
                            "transportNumber": "7706",
                            "transportType": "PLANE",
                            "includedBaggage": "2 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "BUSINESS",
                            "technicalStopsVO": []
                        }
                    ]
                },
                {
                    "ref": "15:10MADBCNUX7703BUSINESS",
                    "departure": "MAD",
                    "arrival": "BCN",
                    "departureTime": "2025-11-30 15:10:00",
                    "arrivalTime": "2025-11-30 16:35:00",
                    "duration": 85,
                    "fare": "BUSINESS FLEX",
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "BCN",
                            "departureDateTime": "2025-11-30 15:10:00",
                            "arrivalDateTime": "2025-11-30 16:35:00",
                            "marketingCompany": "UX",
                            "operatingCompany": "UX",
                            "transportNumber": "7703",
                            "transportType": "PLANE",
                            "includedBaggage": "2 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "BUSINESS",
                            "technicalStopsVO": []
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2025-10-08",
                    "amount": {
                        "amount": 941.1,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-01-31",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        },
        {
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2022-01-31",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

This operation creates a reservation of the rate of the selected transport. Some considerations:

\- The **fakeBooking** attribute is optional. If not sent, the reservation will be closed as BOOKED in the test environment or with the actual state returned by the vendor in the production environment. This attribute is useful if you want to simulate an error, in which case you can send BOOK\_ERROR. Keep in mind that with the **fakeBooking** attribute the reservation will not be persisted in the Travelcompositor system or sent to suppliers if it is in a production environment.

\- The **externalReference** attribute is optional. It can be used to save the customer's reference and thus link it to the generated reservation.

\- The recommendationKey returned in the [Prebook](#prebooktransport) operation response, must be sent

```
{
    "transports":
    {
        "recommendationKey": "eyJhbGciOiJIUzI1NiIsInppcCI6IkRFRiJ9.eNrsV0tv4kgQ_ivI14WobR4bfFoHPJGV8JAhh2g0GrXtAnpjur3tdmaYKP99q2xDCIRkopU2l_iA6K7qen71tf1g5QYyy7WmoX8xmVz5Q6tp8XsuUh6JVJhNkFhuz2k3rb9VoSVscsv9-mAlkHFtCg1DbgBPO8xpt1iv5fTw-E5IZkdBy2b7m_NNRoKhP5sHY28eTMbkUWtxz1PcDyf-0_oF3cfmae9tduC9Mva7rnexvuL9W9NShYlUIbEuD1am1b1IQA-UXIhlobkRSlLJHOfcaVoSzFSLGEiVr_GQsVzbYWftftOKC61Bxhv04N-EmBdpD9R6LfIcjfAohaOz7Iy9dNDwn5AfKTsvK29DDmEBJKIUv3hXfuu812E922bnWIGYoyBNy3SmKhWxgLrx-xXvtlifylU7fHL9JzuzO8fOqXqxkkbz2IxUwrf4wjg15BiUNEORx2TjC6cGLniaQ9Na4CIs0jqEGENYKr2p424MvLl_OQlv7bLVeaxFRmGTmN9Bgw43NJ5u7AntEkenLDnvsOS8aqn9DkvtVy113mGp86ql7jssdSvES_jBNzXA6p6k6kescrNb87js20AlZZu-UUvXXN_Vi4jnQD31SoRMQU95noNcgq7kKc_NXMR3YIRcDp-DzKZ-bGE7K7IsFXSszOr77GY6vQ78EFU0TaXByGfAdbzahabuaUC3g7UFEjrFGRcIaPToCZ0KCRQ9Gg4urCoij4hwLtbPomEN1ne7zO0S9pN65nGu212sQpIIWvIUGcEgzEP4pxAaEkyJV06fVMoSLCWN4qES7q9xGt4i24btuKzrsj3SekGn4zqs0jlg5mfsNwg8XONsyjxT2oyLdbSrcsumB8XUUThRMJWBPlVMSjCjjOpNqxrqeoUu6o2acqc3F9fB4Li8EV8u-RICuVCo1WaNq8uSrCIhB9ivvLbnDybjyegWRZFSdxjRvvB2P8utv2tv7FfpaYEOLhFKWY2fx7IdKcQGkovKP_UImVTI_3IPnODIz2vg8xr4vAZOXgMfzfHsf-Z45Lg3OZ50Oq7dPeb4cDI6fMN9g-PZB5M8-zg6T0SOwIqKKhTkdNA5_cPuSF7Cw5NGSaFq4IyrzRly5Ap-ETaxAICfU4lHNimVSGizqrtl9_vVjUwlxiHRBvLNXJiUhKNgNi_fYXBYBHUKheYv-jmL1Zpef1aKio1Dozd15n-0O1sBrnrbpxz6OuApJPp3w30eLWKLtZjTcs5PR_tIVctRFsOohAz1ala6k8uiLKzl0ycW_MxE1eLDkUbk4pDZbnnbUNCDFZ6FJHwijcd_AQAA__8.E8XfufTwBMSsDC-aZIzykxkvPn6RPhy7NVu-pFocvHI"
    },
    "externalReference": "Client reference"
}
```

**Book response**

Book - Round trip - Response

```
{
    "auditData":
    {
        "timestamp": "2023-05-10 09:51:18",
        "processTime": 68,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MTU4NDgsImp0aSI6IjIwM0NCRTFGLThBQzEtNDQ1RS05REEzLTI3NDQzNUU2NUMwMiJ9.5SruvexAq4us7trhYUTY4-u2aoHzHX2NWJ6Rb-M9-c9GmoKHxyzCakRJ2e3ERfXIujJKR3ITTLOv9Yh9TL7_EQ",
        "traceId": "203CBE1F-8AC1-445E-9DA3-274435E65C02",
        "availabilityId": 623,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-2088",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "priceBreakdown":
    {
        "totalPrice":
        {
            "amount": 73.06,
            "currency": "EUR"
        },
        "taxes":
        {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "services":
    [
        {
            "bookingReference": "FAKE-1240702745",
            "status": "BOOKED",
            "provider": "FakeFlight",
            "journeys":
            [
                {
                    "ref": "12:05PMICIAIBFAKE-11111ECONOMY",
                    "departure": "PMI",
                    "arrival": "CIA",
                    "departureTime": "2023-06-26 12:05:00",
                    "arrivalTime": "2023-06-26 14:20:00",
                    "duration": 135,
                    "lowcost": false,
                    "segments":
                    [
                        {
                            "departure": "PMI",
                            "arrival": "CIA",
                            "departureDateTime": "2023-06-26 12:05:00",
                            "arrivalDateTime": "2023-06-26 14:20:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11111",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                },
                {
                    "ref": "12:05ROMPMIIBFAKE-111110ECONOMY",
                    "departure": "ROM",
                    "arrival": "PMI",
                    "departureTime": "2023-06-30 12:05:00",
                    "arrivalTime": "2023-06-30 14:15:00",
                    "duration": 130,
                    "lowcost": false,
                    "segments":
                    [
                        {
                            "departure": "ROM",
                            "arrival": "PMI",
                            "departureDateTime": "2023-06-30 12:05:00",
                            "arrivalDateTime": "2023-06-30 14:15:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111110",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies":
            [
                {
                    "date": "2023-05-09",
                    "amount":
                    {
                        "amount": 73.06,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons":
    [
        {
            "id": "TST-2088-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-06-20",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        },
        {
            "id": "TST-2088-0-1",
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-02-28",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

Book - Round trip with two oneways and selected baggage - Response

```
{
    "auditData": {
        "timestamp": "2023-05-10 09:56:18",
        "processTime": 93,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MTYxMzcsImp0aSI6IjhBODM0MTc4LUIzNDgtNDVBQy1BOTU4LUUwRUU2N0UwMzE1NyJ9.t2IEFCmCyoLRxsKNUcC_gSpAU6Bey9ezbJHqGTZb8yDP4gZIHcxeDK95lNs4k-pFyAsDmKlzB95Gamzk1vUooA",
        "traceId": "8A834178-B348-45AC-A958-E0EE67E03157",
        "availabilityId": 429,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-2089",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "priceBreakdown": {
        "totalPrice": {
            "amount": 418.57,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "services": [
        {
            "bookingReference": "FAKE-233236110",
            "status": "BOOKED",
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:00MADFCOIBFAKE-11110ECONOMY",
                    "departure": "MAD",
                    "arrival": "FCO",
                    "departureTime": "2023-06-26 12:00:00",
                    "arrivalTime": "2023-06-26 15:10:00",
                    "duration": 190,
                    "selectedBaggage": [
                        {
                            "roundTripPrice": false,
                            "personIndex": 1,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        },
                        {
                            "roundTripPrice": false,
                            "personIndex": 2,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        }
                    ],
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "FCO",
                            "departureDateTime": "2023-06-26 12:00:00",
                            "arrivalDateTime": "2023-06-26 15:10:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11110",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 302.61,
                        "currency": "EUR"
                    }
                }
            ]
        },
        {
            "bookingReference": "FAKE-1797270311",
            "status": "BOOKED",
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:20ROMMADIBFAKE-111140ECONOMY",
                    "departure": "ROM",
                    "arrival": "MAD",
                    "departureTime": "2023-06-30 12:20:00",
                    "arrivalTime": "2023-06-30 15:30:00",
                    "duration": 190,
                    "selectedBaggage": [
                        {
                            "roundTripPrice": false,
                            "personIndex": 1,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        },
                        {
                            "roundTripPrice": false,
                            "personIndex": 2,
                            "quantity": 1,
                            "weight": "25 kg",
                            "price": {
                                "amount": 10.42,
                                "currency": "EUR"
                            }
                        }
                    ],
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "ROM",
                            "arrival": "MAD",
                            "departureDateTime": "2023-06-30 12:20:00",
                            "arrivalDateTime": "2023-06-30 15:30:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111140",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 115.96,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "id": "TST-2089-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-06-20",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "911111111"
        },
        {
            "id": "TST-2089-0-1",
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-01-30",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

This operation allows you to recover the cancellation fees of a transport reservation on the day and time that the query is made. To cancel the reservation you should use the [Cancel](#canceltransport) operation.

```
curl --location --request GET 'http://localhost/resources/booking/TST-2097/transports/FAKE-272583093/cancellation-fee' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjQ4NjcsImp0aSI6IjAwMjk2RjBCLTBCQTItNEIzRC1BRjU5LURDOTA4MzFDQTlBOSJ9.pcUk4smHDftLuibfo2gBXBJyipLbt0XByoBN6nqGGJzaLnW1OJTgRDpnIik1GBnu5iDUcMP9-QnXorfLiJI8SA' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2023-05-10 12:21:53",
        "processTime": 5,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjQ4NjcsImp0aSI6IjAwMjk2RjBCLTBCQTItNEIzRC1BRjU5LURDOTA4MzFDQTlBOSJ9.pcUk4smHDftLuibfo2gBXBJyipLbt0XByoBN6nqGGJzaLnW1OJTgRDpnIik1GBnu5iDUcMP9-QnXorfLiJI8SA",
        "traceId": "00296F0B-0BA2-4B3D-AF59-DC90831CA9A9",
        "availabilityId": 940,
        "server": "http://localhost:30000"
    },
    "cancellationFee": {
        "amount": 92.61,
        "currency": "EUR"
    }
}
```

This operation allows the cancellation of a transport reservation. To recover cancellation fees you can use the [Cancellation fees](#cancellationfeestransport) operation.

```
curl --location --request DELETE 'http://localhost/resources/booking/TST-2097/transports/FAKE-272583093' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjQ4NjcsImp0aSI6IjAwMjk2RjBCLTBCQTItNEIzRC1BRjU5LURDOTA4MzFDQTlBOSJ9.pcUk4smHDftLuibfo2gBXBJyipLbt0XByoBN6nqGGJzaLnW1OJTgRDpnIik1GBnu5iDUcMP9-QnXorfLiJI8SA' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2023-05-10 12:22:14",
        "processTime": 7049,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjQ4NjcsImp0aSI6IjAwMjk2RjBCLTBCQTItNEIzRC1BRjU5LURDOTA4MzFDQTlBOSJ9.pcUk4smHDftLuibfo2gBXBJyipLbt0XByoBN6nqGGJzaLnW1OJTgRDpnIik1GBnu5iDUcMP9-QnXorfLiJI8SA",
        "traceId": "00296F0B-0BA2-4B3D-AF59-DC90831CA9A9",
        "availabilityId": 940,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-2097",
    "externalReference": "Client reference",
    "status": "CANCELED",
    "priceBreakdown": {
        "totalPrice": {
            "amount": 92.61,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "services": [
        {
            "bookingReference": "FAKE-272583093",
            "status": "CANCELED",
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:05PMIMADIBFAKE-11111ECONOMY",
                    "departure": "PMI",
                    "arrival": "MAD",
                    "departureTime": "2023-06-26 12:05:00",
                    "arrivalTime": "2023-06-26 13:20:00",
                    "duration": 75,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "PMI",
                            "arrival": "MAD",
                            "departureDateTime": "2023-06-26 12:05:00",
                            "arrivalDateTime": "2023-06-26 13:20:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11111",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                },
                {
                    "ref": "12:05MADPMIIBFAKE-111110ECONOMY",
                    "departure": "MAD",
                    "arrival": "PMI",
                    "departureTime": "2023-06-30 12:05:00",
                    "arrivalTime": "2023-06-30 13:15:00",
                    "duration": 70,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "PMI",
                            "departureDateTime": "2023-06-30 12:05:00",
                            "arrivalDateTime": "2023-06-30 13:15:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111110",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 92.61,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "id": "TST-2097-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-06-20",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        },
        {
            "id": "TST-2097-0-1",
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-02-28",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

This operation allows you to update the reservation with the latest information that the reservation provider has. An example of use would be: if a transport reservation has been closed with status 'On Request', you can use this operation to check if the status has been updated.

In the **test environment**, this operation will always change the booking status to CANCELED.

```
curl --location --request PUT 'http://localhost/resources/booking/TST-2098/transports/FAKE-1556166210' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjU3OTEsImp0aSI6IjZBRDBDRTJCLTJFQjEtNDRFQy1BN0I4LUQwRDc5RjE3NjcyNSJ9.kESnMmMKaK0cWPELEtKAJubDZTPE8cfWeUr9mHjcc0TN0v_rBBVs3gQoiis6-KVoIBSokVaE6je-fHwQB_KdJg' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2023-05-10 12:37:39",
        "processTime": 54,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjU3OTEsImp0aSI6IjZBRDBDRTJCLTJFQjEtNDRFQy1BN0I4LUQwRDc5RjE3NjcyNSJ9.kESnMmMKaK0cWPELEtKAJubDZTPE8cfWeUr9mHjcc0TN0v_rBBVs3gQoiis6-KVoIBSokVaE6je-fHwQB_KdJg",
        "traceId": "6AD0CE2B-2EB1-44EC-A7B8-D0D79F176725",
        "availabilityId": 692,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-2098",
    "externalReference": "Client reference",
    "status": "CANCELED",
    "priceBreakdown": {
        "totalPrice": {
            "amount": 108.19,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "services": [
        {
            "bookingReference": "FAKE-1556166210",
            "status": "CANCELED",
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:15MADGRXIBFAKE-11113ECONOMY",
                    "departure": "MAD",
                    "arrival": "GRX",
                    "departureTime": "2023-06-30 12:15:00",
                    "arrivalTime": "2023-06-30 13:40:00",
                    "duration": 85,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "GRX",
                            "departureDateTime": "2023-06-30 12:15:00",
                            "arrivalDateTime": "2023-06-30 13:40:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11113",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 108.19,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "id": "TST-2098-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-01-31",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        },
        {
            "id": "TST-2098-0-1",
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-01-31",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

This operation allows you to retrieve the details of a reservation from the **bookingReference** of the reservation and the **bookingReference** of any service. This operation does not make any calls to the transport providers and only retrieves the data that is in Travel Compositor.

```
curl --location --request GET 'http://localhost/resources/booking/TST-2097/transports/FAKE-272583093' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjQ4NjcsImp0aSI6IjAwMjk2RjBCLTBCQTItNEIzRC1BRjU5LURDOTA4MzFDQTlBOSJ9.pcUk4smHDftLuibfo2gBXBJyipLbt0XByoBN6nqGGJzaLnW1OJTgRDpnIik1GBnu5iDUcMP9-QnXorfLiJI8SA' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2023-05-10 12:21:36",
        "processTime": 4,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGl0cmFuc3BvcnQtYXBpLXRlc3QiLCJleHAiOjE2ODM3MjQ4NjcsImp0aSI6IjAwMjk2RjBCLTBCQTItNEIzRC1BRjU5LURDOTA4MzFDQTlBOSJ9.pcUk4smHDftLuibfo2gBXBJyipLbt0XByoBN6nqGGJzaLnW1OJTgRDpnIik1GBnu5iDUcMP9-QnXorfLiJI8SA",
        "traceId": "00296F0B-0BA2-4B3D-AF59-DC90831CA9A9",
        "server": "http://localhost:30000"
    },
    "bookingReference": "TST-2097",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "priceBreakdown": {
        "totalPrice": {
            "amount": 92.61,
            "currency": "EUR"
        },
        "taxes": {
            "amount": 2.0,
            "currency": "EUR"
        }
    },
    "services": [
        {
            "bookingReference": "FAKE-272583093",
            "status": "BOOKED",
            "provider": "FakeFlight",
            "journeys": [
                {
                    "ref": "12:05PMIMADIBFAKE-11111ECONOMY",
                    "departure": "PMI",
                    "arrival": "MAD",
                    "departureTime": "2023-06-26 12:05:00",
                    "arrivalTime": "2023-06-26 13:20:00",
                    "duration": 75,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "PMI",
                            "arrival": "MAD",
                            "departureDateTime": "2023-06-26 12:05:00",
                            "arrivalDateTime": "2023-06-26 13:20:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-11111",
                            "transportType": "PLANE",
                            "includedBaggage": "30 KG",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                },
                {
                    "ref": "12:05MADPMIIBFAKE-111110ECONOMY",
                    "departure": "MAD",
                    "arrival": "PMI",
                    "departureTime": "2023-06-30 12:05:00",
                    "arrivalTime": "2023-06-30 13:15:00",
                    "duration": 70,
                    "lowcost": false,
                    "segments": [
                        {
                            "departure": "MAD",
                            "arrival": "PMI",
                            "departureDateTime": "2023-06-30 12:05:00",
                            "arrivalDateTime": "2023-06-30 13:15:00",
                            "marketingCompany": "IB",
                            "operatingCompany": "IB",
                            "transportNumber": "FAKE-111110",
                            "transportType": "PLANE",
                            "includedBaggage": "0 PC",
                            "fareType": "PUBLIC",
                            "cabinType": "ECONOMY"
                        }
                    ]
                }
            ],
            "cancellationPolicies": [
                {
                    "date": "2023-05-09",
                    "amount": {
                        "amount": 92.61,
                        "currency": "EUR"
                    }
                }
            ]
        }
    ],
    "persons": [
        {
            "id": "TST-2097-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "birthDate": "1993-06-20",
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        },
        {
            "id": "TST-2097-0-1",
            "name": "Child",
            "lastName": "Test",
            "requestedAge": 3,
            "birthDate": "2020-02-28",
            "courtesyTitle": "MISTER"
        }
    ]
}
```

## 1\. What\`s the transport data format (XML / JSON)?

Only JSON.

## 2\. Does it support gzip?

Yes, is mandatory.

## 3\. Is there any limit on the Max No. of passengers?

9 travellers.

## 4\. Does it support child or not? Age range?

Yes, it is supported. Children's age range goes form 2 till 17 years old (inclusive). Infant's age range goes from 0 till 1 years old (inclusive).

## 5\. Is there any limit on the Max No. of Adults?

9 Adults.

## 6\. Is there any limit on the Max No. of Children?

8 Children. One adult mandatory.

## 7\. Support multi-currency or not?

No.

## 8\. In the pre book step,will you provide cache rate or real rate?

Depending on connected providers, normally this does not happen. We are a supplier hub.

## 9\. Can we specify the currency in which we want the results in the availability request? If not, is it possible that we have different currencies in the different recommendations?

No, always will be returned the currency which is set up at microsite configuration and always will be the same.

## 10\. Which is the certification procees to follow?

We will ask you for the request and response of all the calls to verify that the calls are being made correctly. It shouldn't take more than a few days. Ideally, if it were possible to have a staging site to test the flow, that would be great, but it's not required.

We will also request:

\- **A One-Way booking**

\- **Two One-Way booking**

\- **A Round-Trip booking with extra baggage**

\- **A Round-Trip booking with an adult, a child, and an infant**

## 11\. Which booking statuses can be found in your system?

Our system handles statuses at two levels: **booking status** and **service status**. The booking status is calculated from the statuses of the services included in the booking.

**Service statuses:**  
\- **BOOKED** - Service confirmed successfully.  
\- **BOOK\_ERROR** - An error occurred while booking or closing the service.  
\- **CANCELED** - Canceled service.  
\- **PRICE\_ERROR** - The service was booked, but a price change was detected when closing it with the provider. The tolerance to return **BOOKED** can be configured in Microsite Settings. If no value is configured, the system default tolerance is applied.  
\- **NOT\_BOOKED** - The service was not confirmed by the provider.  
\- **RQ** - Service on request, pending provider confirmation.  
\- **PENDING\_BOOK** - The service is still in the booking process.

**Booking statuses:**  
\- **NOT\_BOOKED** - The booking is considered not booked, typically when all services ended in non-confirmed statuses such as **BOOK\_ERROR** or **NOT\_BOOKED**.  
\- **RQ** - At least one service is in **RQ**. Some providers can return an **RQ** in the [Book](#booktransport) operation. TravelCApi has a scheduler that checks the status of the booking and updates it when it changes to **BOOKED**. You can check the booking status at any time right after BOOK by calling [Booking details](#bookingdetailtransport) or [Refresh](#refreshtransport) .  
\- **PRICE\_ERROR** - At least one service has a price change error.  
\- **PENDING\_BOOK** - At least one service is still in **PENDING\_BOOK**.  
\- **BOOKED** - All services are in **BOOKED** and there is no previous booking error condition.  
\- **BOOK\_ERROR** - Fallback status when the booking is not fully confirmed and none of the previous cases apply.  
\- **CANCELED** - Canceled booking.

## 12\. Are Nego fares (Corporate codes, PTC) allowed?

This will be a mirror of the fares configurated for each provider on the operator Microsite

## 13\. Are Family Fares allowed?

This will be developed on a second stage.

## 14\. Is seat assignment allowed?

This will be developed on a second stage.

The TravelC Multi-engine API flow lets you quote and book a combined reservation that includes accommodation and transport in a single checkout.

The number of accommodations and transports available will depend on the providers connected by the customer.

Use our Postman collection to test our APIs now and familiarize yourself with them:

[Postman](https://online.travelcompositor.com/resources/api-multi-engine/TravelC_Api_Multi-Engine.postman_collection.json)

If you don't have credentials yet, check out our [Getting started](https://online.travelcompositor.com/api/documentation/index.xhtml#intro) section to help you understand how to get started with the TravelC API

All API responses always return an audit object that the support team might request to trace requests.

```
"auditData": {
    "timestamp": "2022-11-15 09:05:14",
    "processTime": 69,
    "authToken": "{{auth-token}}",
    "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
    "availabilityId": 946,
    "server": "http://travelc-host-xxxx:xxxxx"
}
```

Below we show a flowchart with the steps necessary to complete a reservation through the API. Then we will explain each of the steps:

![](https://online.travelcompositor.com/resources/images/api-documentation/booking-multi-engine-flow.png)

Start the accommodation part of the multi-engine flow by calling **{{endpoint}}/resources/booking/accommodations/quote**. You can request availability by accommodation codes or by destination.

Use **tripType** with value **FLIGHT\_HOTEL** so the availability is quoted for a combined booking. The response returns accommodations with their available combinations. Keep the selected **combinationKey** for confirm, prebook, and book.

To review the accommodation quote structure in more detail, check the [Accommodation API quote section](https://online.travelcompositor.com/api/documentation/index.xhtml#quoteaccommodation) .

Quote accommodation - Request by destination

```
{
    "checkIn": "2025-06-26",
    "checkOut": "2025-06-30",
    "distributions": [
        {
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 30
                }
            ]
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "tripType": "FLIGHT_HOTEL",
    "filter": {
        "bestCombinations": true
    },
    "destinationId": "MAD"
}
```

Quote accommodation - Request by accommodation codes

```
{
    "checkIn": "2025-06-26",
    "checkOut": "2025-06-30",
    "distributions": [
        {
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 30
                }
            ]
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "tripType": "FLIGHT_HOTEL",
    "filter": {
        "bestCombinations": true
    },
    "accommodations": [
        "1",
        "1000",
        "1003"
    ]
}
```

If you already know the accommodation to quote, you can use the single accommodation quote endpoint:

```
POST {{endpoint}}/resources/booking/accommodations/{{accommodationId}}/quote

{
    "checkIn": "2025-06-26",
    "checkOut": "2025-06-30",
    "distributions": [
        {
            "persons": [
                {
                    "age": 30
                },
                {
                    "age": 30
                }
            ]
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "tripType": "FLIGHT_HOTEL"
}
```

Quote the transport part with **{{endpoint}}/resources/booking/transports/quote**. You can request a round trip by destination or by transport base.

Keep the selected **recommendationKey**. When the chosen trip is made from two one-way recommendations, keep both **outboundRecommendationKey** and **inboundRecommendationKey**.

To review the transport quote structure in more detail, check the [Transport API quote section](https://online.travelcompositor.com/api/documentation/index.xhtml#quotetransport) .

Quote transport - Round trip by destinations

```
{
    "journeys": [
        {
            "departureDate": "2025-06-26",
            "departure": "PMI-10",
            "departureType": "DESTINATION",
            "arrival": "MAD",
            "arrivalType": "DESTINATION"
        },
        {
            "departureDate": "2025-06-30",
            "departure": "MAD",
            "departureType": "DESTINATION",
            "arrival": "PMI-10",
            "arrivalType": "DESTINATION"
        }
    ],
    "persons": [
        {
            "age": 30
        },
        {
            "age": 30
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "tripType": "FLIGHT_HOTEL"
}
```

Quote transport - Round trip by transport bases

```
{
    "journeys": [
        {
            "departureDate": "2023-06-26",
            "departure": "PMI",
            "departureType": "TRANSPORT_BASE",
            "arrival": "MAD",
            "arrivalType": "TRANSPORT_BASE"
        },
        {
            "departureDate": "2023-06-30",
            "departure": "MAD",
            "departureType": "TRANSPORT_BASE",
            "arrival": "PMI",
            "arrivalType": "TRANSPORT_BASE"
        }
    ],
    "persons": [
        {
            "age": 30
        },
        {
            "age": 3
        }
    ],
    "language": "EN",
    "sourceMarket": "ES"
}
```

Quote transport - Two one-way recommendations

```
{
    "journeys": [
        {
            "departureDate": "2025-06-26",
            "departure": "MAD",
            "departureType": "DESTINATION",
            "arrival": "ROE",
            "arrivalType": "DESTINATION"
        },
        {
            "departureDate": "2025-06-30",
            "departure": "ROE",
            "departureType": "DESTINATION",
            "arrival": "MAD",
            "arrivalType": "DESTINATION"
        }
    ],
    "persons": [
        {
            "age": 30
        },
        {
            "age": 30
        }
    ],
    "language": "EN",
    "sourceMarket": "ES",
    "tripType": "FLIGHT_HOTEL"
}
```

This operation returns the rate confirmation of the selected accommodation combination and transport recommendation. This means:

\- Confirmation of the accommodation cancellation policies, remarks and selected combination.

\- Confirmation of the transport cancellation policies, fare rules, baggage options and maximum passenger name length when available.

\- Returns the required passenger fields for the whole multi-engine booking. The contact person will always be the first passenger of the booking.

\- Returns the total confirmed price of the combined reservation.

To review each product response structure in more detail, check the [Accommodation API confirm section](https://online.travelcompositor.com/api/documentation/index.xhtml#confirmaccommodation) and the [Transport API confirm section](https://online.travelcompositor.com/api/documentation/index.xhtml#confirmtransport) .

```
{
    "accommodation": {
        "combinationKey": "{{combinationKey}}"
    },
    "transports": {
        "recommendationKey": "{{recommendationKey}}"
    }
}
```

```
{
    "accommodation": {
        "combinationKey": "{{combinationKey}}"
    },
    "transports": {
        "outboundRecommendationKey": "{{outboundRecommendationKey}}",
        "inboundRecommendationKey": "{{inboundRecommendationKey}}"
    }
}
```

**Confirm - Response**

```
{
    "auditData": {
        "timestamp": "2025-06-26 12:00:00",
        "processTime": 1250,
        "authToken": "{{auth-token}}",
        "traceId": "{{traceId}}",
        "availabilityId": 946,
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "warnings": [
        {
            "type": "PRICE_CHANGE",
            "description": "Price has changed"
        },
        {
            "type": "CANCELLATION_POLICIES_CHANGE",
            "description": "Cancellation policies may have changed, please check"
        }
    ],
    "requiredField": {
        "contactPerson": [
            "TITLE",
            "FIRST_NAME",
            "LAST_NAME",
            "EMAIL",
            "PHONE"
        ],
        "otherPersons": [
            "TITLE",
            "FIRST_NAME",
            "LAST_NAME"
        ],
        "roomHolders": [
            "TITLE",
            "FIRST_NAME",
            "LAST_NAME",
            "EMAIL"
        ]
    },
    "price": {
        "amount": 303.06,
        "currency": "EUR"
    },
    "accommodation": {
        "accommodation": {
            "code": "MASTER-1782232",
            "name": "Hotel Fake multi-engine API"
        },
        "stay": {
            "checkIn": "2025-06-26",
            "checkOut": "2025-06-30"
        },
        "combination": {
            "combinationKey": "{{combinationKey}}",
            "price": {
                "amount": 203.06,
                "currency": "EUR"
            },
            "cancellationPolicies": [
                {
                    "date": "2025-06-21",
                    "amount": {
                        "amount": 101.53,
                        "currency": "EUR"
                    }
                }
            ],
            "remarks": [
                "Accommodation remark"
            ]
        }
    },
    "transports": {
        "recommendationKey": "{{recommendationKey}}",
        "maxPersonNameLength": 50,
        "priceBreakdown": {
            "totalPrice": {
                "amount": 100.0,
                "currency": "EUR"
            }
        },
        "services": [
            {
                "provider": "FakeTransport",
                "journeys": [
                    {
                        "departure": "PMI",
                        "arrival": "MAD",
                        "departureTime": "2025-06-26 12:00:00",
                        "arrivalTime": "2025-06-26 13:00:00"
                    }
                ],
                "cancellationPolicies": [
                    {
                        "date": "2025-06-25",
                        "amount": {
                            "amount": 100.0,
                            "currency": "EUR"
                        }
                    }
                ]
            }
        ]
    }
}
```

This operation creates a pre-reservation of the selected accommodation and transport. Some considerations:

\- The required data of the required guests, indicated in the response of the [Confirm](#confirmmultiengine) operation, must be sent.

\- The distribution sent must match the one requested in the accommodation quote, as well as the **requestedAge** of each guest.

\- The passengers must follow the same order than the one indicated in the transport quote, and the age for children and infants must also be the same.

\- The accommodation **combinationKey** and the transport **recommendationKey** returned in the [Confirm](#confirmmultiengine) operation response must be sent.

\- Prebook is an extra call to providers to validate that all the information received on the Confirm is correct.

\- This call allows to confirm that all the data received to be booked is correct: price, selected services, cancellation policies and passenger data.

\- Using **commentToAccommodation** you can send comments to the booked accommodation.

\- If extra baggage is selected for the transport, it must also be indicated in this operation. Add the selected options in the **extraBaggage** list inside the **transports** block.

To review each product prebook structure in more detail, check the [Accommodation API prebook section](https://online.travelcompositor.com/api/documentation/index.xhtml#prebookaccommodation) and the [Transport API prebook section](https://online.travelcompositor.com/api/documentation/index.xhtml#prebooktransport) .

```
{
    "accommodation": {
        "combinationKey": "{{combinationKey}}",
        "commentToAccommodation": "comments received by the accommodation"
    },
    "transports": {
        "recommendationKey": "{{recommendationKey}}",
        "extraBaggage": [
            {
                "optionKey": "{{extraBaggageOptionKey}}"
            }
        ]
    },
    "distributions": [
        {
            "persons": [
                {
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                },
                {
                    "name": "Test",
                    "lastName": "Other Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                }
            ]
        }
    ]
}
```

**Prebook - Response**

```
{
    "auditData": {
        "timestamp": "2025-06-26 12:00:05",
        "processTime": 1450,
        "authToken": "{{auth-token}}",
        "traceId": "{{traceId}}",
        "availabilityId": 946,
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "warnings": [
        {
            "type": "PRICE_CHANGE",
            "description": "Price has changed"
        }
    ],
    "price": {
        "amount": 303.06,
        "currency": "EUR"
    },
    "accommodation": {
        "accommodation": {
            "code": "MASTER-1782232",
            "name": "Hotel Fake multi-engine API"
        },
        "stay": {
            "checkIn": "2025-06-26",
            "checkOut": "2025-06-30"
        },
        "combination": {
            "combinationKey": "{{combinationKey}}",
            "commentToAccommodation": "comments received by the accommodation",
            "price": {
                "amount": 203.06,
                "currency": "EUR"
            }
        }
    },
    "transports": {
        "recommendationKey": "{{recommendationKey}}",
        "priceBreakdown": {
            "totalPrice": {
                "amount": 100.0,
                "currency": "EUR"
            }
        },
        "services": [
            {
                "provider": "FakeTransport",
                "journeys": [
                    {
                        "departure": "PMI",
                        "arrival": "MAD",
                        "departureTime": "2025-06-26 12:00:00",
                        "arrivalTime": "2025-06-26 13:00:00"
                    }
                ]
            }
        ],
        "nameChangedRemarks": []
    },
    "distributions": [
        {
            "persons": [
                {
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                },
                {
                    "name": "Test",
                    "lastName": "Other Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                }
            ]
        }
    ]
}
```

This operation creates a reservation of the selected accommodation and transport. Some considerations:

\- The **fakeBooking** attribute is optional. If not sent, the reservation will be closed as BOOKED in the test environment or with the actual state returned by the vendors in the production environment. This attribute is useful if you want to simulate an error, in which case you can send BOOK\_ERROR. Keep in mind that with the **fakeBooking** attribute the reservation will not be persisted in the Travelcompositor system or sent to suppliers if it is in a production environment.

\- The **externalReference** attribute is optional. It can be used to save the customer's reference and thus link it to the generated reservation.

\- The accommodation **combinationKey** and the transport **recommendationKey** returned in the [Prebook](#prebookmultiengine) operation response must be sent.

\- The response returns the booking reference, the global booking status and each product booking reference.

To review each product book structure in more detail, check the [Accommodation API book section](https://online.travelcompositor.com/api/documentation/index.xhtml#bookaccommodation) and the [Transport API book section](https://online.travelcompositor.com/api/documentation/index.xhtml#booktransport) .

```
{
    "accommodation": {
        "combinationKey": "{{combinationKey}}"
    },
    "transports": {
        "recommendationKey": "{{recommendationKey}}"
    },
    "externalReference": "Client reference"
}
```

**Book - Response**

```
{
    "auditData": {
        "timestamp": "2025-06-26 12:00:15",
        "processTime": 11230,
        "authToken": "{{auth-token}}",
        "traceId": "{{traceId}}",
        "availabilityId": 946,
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "bookingReference": "TST-1464",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "price": {
        "amount": 303.06,
        "currency": "EUR"
    },
    "accommodation": {
        "accommodation": {
            "code": "MASTER-1782232",
            "name": "Hotel Fake multi-engine API"
        },
        "stay": {
            "checkIn": "2025-06-26",
            "checkOut": "2025-06-30"
        },
        "bookingReference": "FAKE-HOTEL-1775464987",
        "status": "BOOKED",
        "combination": {
            "price": {
                "amount": 203.06,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "transports": {
        "priceBreakdown": {
            "totalPrice": {
                "amount": 100.0,
                "currency": "EUR"
            }
        },
        "services": [
            {
                "bookingReference": "FAKE-TRANSPORT-1240702745",
                "status": "BOOKED",
                "provider": "FakeTransport",
                "journeys": [
                    {
                        "departure": "PMI",
                        "arrival": "MAD",
                        "departureTime": "2025-06-26 12:00:00",
                        "arrivalTime": "2025-06-26 13:00:00"
                    }
                ]
            }
        ],
        "nameChangedRemarks": []
    },
    "distributions": [
        {
            "id": "TST-1464-0",
            "persons": [
                {
                    "id": "TST-1464-0-0",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                },
                {
                    "id": "TST-1464-0-1",
                    "name": "Test",
                    "lastName": "Other Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                }
            ]
        }
    ]
}
```

This operation allows you to retrieve the details of a multi-engine reservation from the **bookingReference** of the reservation. This operation does not make any calls to accommodation or transport providers and only retrieves the data that is in Travel Compositor.

The response returns the same multi-engine booking structure returned by the [Book](#bookmultiengine) operation, including the global booking data and the accommodation and transport details.

```
curl --location --request GET '{{endpoint}}/resources/booking/{{bookingReference}}' \
--header 'auth-token: {{auth-token}}' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2025-06-26 12:05:00",
        "processTime": 18,
        "authToken": "{{auth-token}}",
        "traceId": "{{traceId}}",
        "server": "http://travelc-host-xxxx:xxxxx"
    },
    "bookingReference": "TST-1464",
    "externalReference": "Client reference",
    "status": "BOOKED",
    "price": {
        "amount": 303.06,
        "currency": "EUR"
    },
    "accommodation": {
        "accommodation": {
            "code": "MASTER-1782232",
            "name": "Hotel Fake multi-engine API"
        },
        "stay": {
            "checkIn": "2025-06-26",
            "checkOut": "2025-06-30"
        },
        "bookingReference": "FAKE-HOTEL-1775464987",
        "status": "BOOKED",
        "combination": {
            "price": {
                "amount": 203.06,
                "currency": "EUR"
            },
            "provider": "FakeHotel",
            "commentToAccommodation": "comments received by the accommodation"
        }
    },
    "transports": {
        "priceBreakdown": {
            "totalPrice": {
                "amount": 100.0,
                "currency": "EUR"
            }
        },
        "services": [
            {
                "bookingReference": "FAKE-TRANSPORT-1240702745",
                "status": "BOOKED",
                "provider": "FakeTransport",
                "journeys": [
                    {
                        "departure": "PMI",
                        "arrival": "MAD",
                        "departureTime": "2025-06-26 12:00:00",
                        "arrivalTime": "2025-06-26 13:00:00"
                    }
                ]
            }
        ]
    },
    "distributions": [
        {
            "id": "TST-1464-0",
            "persons": [
                {
                    "id": "TST-1464-0-0",
                    "name": "Test",
                    "lastName": "Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER",
                    "email": "test@test.com",
                    "phoneCountryCode": "+34",
                    "phone": "666666666",
                    "birthdate": "1986-02-14"
                },
                {
                    "id": "TST-1464-0-1",
                    "name": "Test",
                    "lastName": "Other Test",
                    "requestedAge": 30,
                    "courtesyTitle": "MISTER"
                }
            ]
        }
    ]
}
```

The Multi-engine API booking flow combines accommodation and transport in the same reservation. For product-specific questions, review the FAQ of each product:

\- [Accommodation API FAQ](https://online.travelcompositor.com/api/documentation/index.xhtml#accomodationfaq)

\- [Transport API FAQ](https://online.travelcompositor.com/api/documentation/index.xhtml#trasnportfaq)

TravelC Transfer API is designed to provide a set of API calls to bring transfer reservation to any website or device:

The TravelC Transfer API suite is divided into 2 parts:

\- **Booking flow**

\- **Post-booking**

The number of transfers available will depend on the providers connected by the customer.

Use our Postman collection to test our APIs now and familiarize yourself with them:

[Postman](https://online.travelcompositor.com/resources/api-transfer/TravelC_Api_Transfer.postman_collection.json)

If you don't have credentials yet, check out our [Getting started](https://online.travelcompositor.com/api/documentation/index.xhtml#intro) section to help you understand how to get started with the TravelC API

All API responses always return an audit object that the support team might request to trace requests.

```
"auditData": {
                                    "timestamp": "2022-11-15 09:05:14",
                                    "processTime": 69,
                                    "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
                                    "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
                                    "availabilityId": 946,
                                    "server": "http://travelc-host-xxxx:xxxxx"
                                }
```

Below we show a flowchart with the steps necessary to complete a reservation through the API. Then we will explain each of the steps:

![](https://online.travelcompositor.com/resources/images/api-documentation/booking-transfer-flow.png)

This is the first step in making a booking and retrieving the list of available vehicles.

There are two types of trips available:

**Transfer IN** → A trip to a hotel.

**Transfer OUT** → A trip to a transport base, including airport, port or train

The system will automatically detect which type of trip is being requested.

**Quote transfers - Request**

The required parameters to request availability are:

**From**:

\- **accommodationId**: ID of the origin hotel

\- **transportBaseId**: ID of the origin transport base

**To**:

\- **accommodationId**: ID of the destination hotel

\- **transportBaseId**: ID of the destination transport base

**Other parameters**:

\- **arrivalTransportDateTime**: Arrival date and time of the base transport (e.g., inbound flight or train).

\- **departureTransportDateTime**: Departure date and time of the base transport (e.g., outbound flight or train).

\- **pickupDateTime**: Pickup date and time, used when there is no base transport involved (e.g., transfers from and to hotels).

\- **persons**: List of travelers participating in the transfer, including at least the age of each traveler.

\- **language**: Language in which the information is requested.

**Usage logic depending on the transfer type:**

\- **Transfer IN** → use **arrivalTransportDateTime**.

\- **Transfer OUT** → use **departureTransportDateTime**.

\- **Transfer OUT from transport base** → use **both** (**arrival** and **departure**).

\- **Transfer IN from a hotel** → use **pickupDateTime**.

Quote transfer IN - Request POST

```
{
    "from": {
         "transportBaseId": "BCN"
    },
    "to": {
         "accommodationId": "48596"
    },
  "arrivalTransportDateTime": "2026-01-14T12:00:00",
  "persons": [
    {
      "age": 120
    }
  ],
  "language": "EN"
}
```

Quote transfer OUT - Request POST

```
{
    "from": {
        "accommodationId": "48596"
    },
    "to": {
        "transportBaseId": "BCN"
    },
  "departureTransportDateTime": "2025-11-25T16:00:00",
  "persons": [
    {
      "age": 120
    }
  ],
  "language": "EN"
}
```

Quote transfer IN from hotel - Request POST

```
{
    "from": {
        "accommodationId": "421"
    },
    "to": {
        "accommodationId": "651"
    },
  "pickupDateTime": "2025-11-25T16:00:00",
  "persons": [
    {
      "age": 120
    }
  ],
  "language": "EN"
}
```

Quote transfer OUT from transport base - Request POST

```
{
    "from": {
         "transportBaseId": "LGW"
    },
    "to": {
         "transportBaseId": "LHR"
    },
  "arrivalTransportDateTime": "2025-12-14T12:00:00",
  "departureTransportDateTime": "2025-12-14T15:00:00",
  "persons": [
    {
      "age": 30
    }
  ],
  "language": "EN",
  "sourceMarket": "ES"
}
```

**Quote transfers - Response**

The response will include the trip details and a list of available transfers, each containing information such as price, vehicle type, and cancellation policies.

Each transfer will also include a unique **transferKey**, which is required to proceed with the next step of the booking flow.

It's important to note that the transfer departure time only appears if it has been confirmed.

```
"total": 2,
    "from": {
        "code": "BCN",
        "name": "Barcelona El Prat "
    },
    "to": {
        "code": "421",
        "name": "Barcelona Century Hotel"
    },
    "arrivalTransportDateTime": "2026-01-13T12:00",
    "persons": 1,
    "transfers": [
        {
            "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbEFycml2YWxEYXRlVGltZSI6WzIwMjYsMSwxMywxMiwwXSwicmF0ZUlkIjoicHJvdmlkZXJUcmFuc2ZlckNvZGUlJSIsInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoyNDg3LCJuZXRQcmljZSI6eyJhbW91bnQiOjguMCwiY3VycmVuY3kiOiJFVVIifSwidG90YWxQcmljZSI6eyJhbW91bnQiOjcuNzcsImN1cnJlbmN5IjoiRVVSIn0sImFycml2YWwiOnRydWUsImZyb21Ib3RlbCI6ZmFsc2UsInRvIjoiNDIxIiwiZnJvbSI6IkJDTiIsInBlcnNvbnNBZ2UiOlt7ImFnZSI6MzB9XSwibGFuZ3VhZ2UiOiJFTiIsInRyYW5zZmVyIjp7InByaWNlIjp7ImFtb3VudCI6Ny43NywiY3VycmVuY3kiOiJFVVIifSwicGlja3VwSW5mb3JtYXRpb24iOiJQaWNrdXAgaW5mbyIsIm1heGltdW1XYWl0aW5nTWludXRlcyI6MTUsImNoYXJhY3RlcmlzdGljcyI6W10sImNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJuZXRQcmljZSI6eyJhbW91bnQiOjAuMCwiY3VycmVuY3kiOiJFVVIifSwiZGF0ZSI6IjIwMjUtMTItMDIifSx7Im5ldFByaWNlIjp7ImFtb3VudCI6Ny43NywiY3VycmVuY3kiOiJFVVIifSwiZGF0ZSI6IjIwMjYtMDEtMTMifV0sImNvbmZpcm1lZFBpY2t1cFRpbWUiOnRydWUsImltYWdlIjoiaHR0cHM6Ly90cjJzdG9yYWdlLmJsb2IuY29yZS53aW5kb3dzLm5ldC90cmFuc2ZlcmltYWdlcy9wcml2YXRlLXNlZGFuLmpwZyIsImRlcGFydHVyZURhdGUiOiIyMDI2LTAxLTEzVDEyOjAwIiwidHJhbnNmZXJUeXBlIjoiU1VWIiwicHJvZHVjdFR5cGUiOiJTUEVDSUFMIiwic2VydmljZVR5cGUiOiJQUklWQVRFIn19.32b7-eiQZJatUcZXRHCT1uyHFfE5g3DDICPddQtpOfk",
            "price": {
                "amount": 7.77,
                "currency": "EUR"
            },
            "pickupInformation": "Pickup info",
            "maximumWaitingMinutes": 15,
            "characteristics": [],
            "cancellationPolicies": [
                {
                    "date": "2025-12-02",
                    "netPrice": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2025-13-01",
                    "netPrice": {
                        "amount": 7.7,
                        "currency": "EUR"
                    }
                }
            ],
            "confirmedPickupTime": true,
            "departureDate": "2026-01-14T14:00:00",
            "transferType": "SUV",
            "productType": "SPECIAL",
            "serviceType": "PRIVATE",
            "additionalCharacteristics": [],
            "onRequest": false,
            "image": "https://tr2storage.blob.core.windows.net/transferimages/private-sedan.jpg"
        },
        {
            "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbEFycml2YWxEYXRlVGltZSI6WzIwMjYsMSwxMywxMiwwXSwicmF0ZUlkIjoicHJvdmlkZXJUcmFuc2ZlckNvZGUlJSIsInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoyNDg3LCJuZXRQcmljZSI6eyJhbW91bnQiOjkuMCwiY3VycmVuY3kiOiJFVVIifSwidG90YWxQcmljZSI6eyJhbW91bnQiOjguNzQsImN1cnJlbmN5IjoiRVVSIn0sImFycml2YWwiOnRydWUsImZyb21Ib3RlbCI6ZmFsc2UsInRvIjoiNDIxIiwiZnJvbSI6IkJDTiIsInBlcnNvbnNBZ2UiOlt7ImFnZSI6MzB9XSwibGFuZ3VhZ2UiOiJFTiIsInRyYW5zZmVyIjp7InByaWNlIjp7ImFtb3VudCI6OC43NCwiY3VycmVuY3kiOiJFVVIifSwicGlja3VwSW5mb3JtYXRpb24iOiJQaWNrdXAgaW5mbyIsIm1heGltdW1XYWl0aW5nTWludXRlcyI6NjAsImNoYXJhY3RlcmlzdGljcyI6W10sImNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJuZXRQcmljZSI6eyJhbW91bnQiOjAuMCwiY3VycmVuY3kiOiJFVVIifSwiZGF0ZSI6IjIwMjUtMTItMDIifSx7Im5ldFByaWNlIjp7ImFtb3VudCI6OC43NCwiY3VycmVuY3kiOiJFVVIifSwiZGF0ZSI6IjIwMjYtMDEtMTMifV0sImNvbmZpcm1lZFBpY2t1cFRpbWUiOnRydWUsImltYWdlIjoiaHR0cHM6Ly90cjJzdG9yYWdlLmJsb2IuY29yZS53aW5kb3dzLm5ldC90cmFuc2ZlcmltYWdlcy9zcGVlZHktc2h1dHRsZS5qcGciLCJkZXBhcnR1cmVEYXRlIjoiMjAyNi0wMS0xM1QxMjowMCIsInRyYW5zZmVyVHlwZSI6IkJVUyIsInByb2R1Y3RUeXBlIjoiU1BFQ0lBTCIsInNlcnZpY2VUeXBlIjoiU0hBUkVEIn19.AJ0zQ-hwJTQ9DZYLpuSS1HtMM6MQL-fOKMRBLM68HpI",
            "price": {
                "amount": 8.74,
                "currency": "EUR"
            },
            "pickupInformation": "Pickup info",
            "maximumWaitingMinutes": 60,
            "characteristics": [],
            "cancellationPolicies": [
                {
                    "date": "2025-12-02",
                    "netPrice": {
                        "amount": 0.0,
                        "currency": "EUR"
                    }
                },
                {
                    "date": "2026-01-13",
                    "netPrice": {
                        "amount": 8.74,
                        "currency": "EUR"
                    }
                }
            ],
            "confirmedPickupTime": true,
            "departureDate": "2026-01-14T14:00:00",
            "transferType": "SUV",
            "productType": "SPECIAL",
            "serviceType": "PRIVATE",
            "additionalCharacteristics": [],
            "onRequest": false,
            "image": "https://tr2storage.blob.core.windows.net/transferimages/private-sedan.jpg"
        }
    ]
}
```

```
{
     "total": 2,
    "from": {
        "code": "421",
        "name": "Barcelona Century Hotel"
    },
    "to": {
        "code": "BCN",
        "name": "Barcelona El Prat "
    },
    "departureTransportDateTime": "2026-01-13T12:00",
    "persons": 1,
    "transfers": [
        {
            "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbERlcGFydHVyZURhdGVUaW1lIjpbMjAyNiwxLDEzLDEyLDBdLCJyYXRlSWQiOiJwcm92aWRlclRyYW5zZmVyQ29kZSUlIiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjI0ODcsIm5ldFByaWNlIjp7ImFtb3VudCI6OC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6Ny43NywiY3VycmVuY3kiOiJFVVIifSwiYXJyaXZhbCI6ZmFsc2UsImZyb21Ib3RlbCI6dHJ1ZSwidG8iOiJCQ04iLCJmcm9tIjoiNDIxIiwicGVyc29uc0FnZSI6W3siYWdlIjozMH1dLCJsYW5ndWFnZSI6IkVOIiwidHJhbnNmZXIiOnsicHJpY2UiOnsiYW1vdW50Ijo3Ljc3LCJjdXJyZW5jeSI6IkVVUiJ9LCJwaWNrdXBJbmZvcm1hdGlvbiI6IlBpY2t1cCBpbmZvIiwibWF4aW11bVdhaXRpbmdNaW51dGVzIjoxNSwiY2hhcmFjdGVyaXN0aWNzIjpbXSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7Im5ldFByaWNlIjp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNS0xMi0wMiJ9LHsibmV0UHJpY2UiOnsiYW1vdW50Ijo3Ljc3LCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNi0wMS0xMyJ9XSwiY29uZmlybWVkUGlja3VwVGltZSI6dHJ1ZSwiaW1hZ2UiOiJodHRwczovL3RyMnN0b3JhZ2UuYmxvYi5jb3JlLndpbmRvd3MubmV0L3RyYW5zZmVyaW1hZ2VzL3ByaXZhdGUtc2VkYW4uanBnIiwiZGVwYXJ0dXJlRGF0ZSI6IjIwMjYtMDEtMTNUMTI6MDAiLCJ0cmFuc2ZlclR5cGUiOiJTVVYiLCJwcm9kdWN0VHlwZSI6IlNQRUNJQUwiLCJzZXJ2aWNlVHlwZSI6IlBSSVZBVEUifX0.jSL_ppuwIsMuxaX-WzreMMCPcUyBgpuRwzwd6gRBO2c",
            "price": {
                "amount": 7.77,
                "currency": "EUR"
            },
            "pickupInformation": "Pickup info",
            "maximumWaitingMinutes": 15,
            "characteristics": [],
            "cancellationPolicies": [
                {
                    "netPrice": {
                        "amount": 0.0,
                        "currency": "EUR"
                    },
                    "date": "2025-12-02"
                },
                {
                    "netPrice": {
                        "amount": 7.77,
                        "currency": "EUR"
                    },
                    "date": "2026-01-13"
                }
            ],
            "confirmedPickupTime": true,
            "image": "https://tr2storage.blob.core.windows.net/transferimages/private-sedan.jpg",
            "departureDate": "2026-01-13T12:00",
            "transferType": "SUV",
            "productType": "SPECIAL",
            "serviceType": "PRIVATE"
        },
        {
            "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbERlcGFydHVyZURhdGVUaW1lIjpbMjAyNiwxLDEzLDEyLDBdLCJyYXRlSWQiOiJwcm92aWRlclRyYW5zZmVyQ29kZSUlIiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjI0ODcsIm5ldFByaWNlIjp7ImFtb3VudCI6OS4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6OC43NCwiY3VycmVuY3kiOiJFVVIifSwiYXJyaXZhbCI6ZmFsc2UsImZyb21Ib3RlbCI6dHJ1ZSwidG8iOiJCQ04iLCJmcm9tIjoiNDIxIiwicGVyc29uc0FnZSI6W3siYWdlIjozMH1dLCJsYW5ndWFnZSI6IkVOIiwidHJhbnNmZXIiOnsicHJpY2UiOnsiYW1vdW50Ijo4Ljc0LCJjdXJyZW5jeSI6IkVVUiJ9LCJwaWNrdXBJbmZvcm1hdGlvbiI6IlBpY2t1cCBpbmZvIiwibWF4aW11bVdhaXRpbmdNaW51dGVzIjo2MCwiY2hhcmFjdGVyaXN0aWNzIjpbXSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7Im5ldFByaWNlIjp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNS0xMi0wMiJ9LHsibmV0UHJpY2UiOnsiYW1vdW50Ijo4Ljc0LCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNi0wMS0xMyJ9XSwiY29uZmlybWVkUGlja3VwVGltZSI6dHJ1ZSwiaW1hZ2UiOiJodHRwczovL3RyMnN0b3JhZ2UuYmxvYi5jb3JlLndpbmRvd3MubmV0L3RyYW5zZmVyaW1hZ2VzL3NwZWVkeS1zaHV0dGxlLmpwZyIsImRlcGFydHVyZURhdGUiOiIyMDI2LTAxLTEzVDEyOjAwIiwidHJhbnNmZXJUeXBlIjoiQlVTIiwicHJvZHVjdFR5cGUiOiJTUEVDSUFMIiwic2VydmljZVR5cGUiOiJTSEFSRUQifX0.uyab0TywBjFPgqsw3y58cCwBbaScRW9OwupXWRaUCm8",
            "price": {
                "amount": 8.74,
                "currency": "EUR"
            },
            "pickupInformation": "Pickup info",
            "maximumWaitingMinutes": 60,
            "characteristics": [],
            "cancellationPolicies": [
                {
                    "netPrice": {
                        "amount": 0.0,
                        "currency": "EUR"
                    },
                    "date": "2025-12-02"
                },
                {
                    "netPrice": {
                        "amount": 8.74,
                        "currency": "EUR"
                    },
                    "date": "2026-01-13"
                }
            ],
            "confirmedPickupTime": true,
            "image": "https://tr2storage.blob.core.windows.net/transferimages/speedy-shuttle.jpg",
            "departureDate": "2026-01-13T12:00",
            "transferType": "BUS",
            "productType": "SPECIAL",
            "serviceType": "SHARED"
        }
    ]
}
```

This operation confirms the selected transfer.

To do so, simply include the **transferKey** of the desired vehicle in the request.

```
{
    "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbERlcGFydHVyZURhdGVUaW1lIjpbMjAyNiwxLDEzLDEyLDBdLCJyYXRlSWQiOiJwcm92aWRlclRyYW5zZmVyQ29kZSUlIiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjI0ODcsIm5ldFByaWNlIjp7ImFtb3VudCI6OC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6Ny43NywiY3VycmVuY3kiOiJFVVIifSwiYXJyaXZhbCI6ZmFsc2UsImZyb21Ib3RlbCI6dHJ1ZSwidG8iOiJCQ04iLCJmcm9tIjoiNDIxIiwicGVyc29uc0FnZSI6W3siYWdlIjozMH1dLCJsYW5ndWFnZSI6IkVOIiwidHJhbnNmZXIiOnsicHJpY2UiOnsiYW1vdW50Ijo3Ljc3LCJjdXJyZW5jeSI6IkVVUiJ9LCJwaWNrdXBJbmZvcm1hdGlvbiI6IlBpY2t1cCBpbmZvIiwibWF4aW11bVdhaXRpbmdNaW51dGVzIjoxNSwiY2hhcmFjdGVyaXN0aWNzIjpbXSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7Im5ldFByaWNlIjp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNS0xMi0wMiJ9LHsibmV0UHJpY2UiOnsiYW1vdW50Ijo3Ljc3LCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNi0wMS0xMyJ9XSwiY29uZmlybWVkUGlja3VwVGltZSI6dHJ1ZSwiaW1hZ2UiOiJodHRwczovL3RyMnN0b3JhZ2UuYmxvYi5jb3JlLndpbmRvd3MubmV0L3RyYW5zZmVyaW1hZ2VzL3ByaXZhdGUtc2VkYW4uanBnIiwiZGVwYXJ0dXJlRGF0ZSI6IjIwMjYtMDEtMTNUMTI6MDAiLCJ0cmFuc2ZlclR5cGUiOiJTVVYiLCJwcm9kdWN0VHlwZSI6IlNQRUNJQUwiLCJzZXJ2aWNlVHlwZSI6IlBSSVZBVEUifX0.jSL_ppuwIsMuxaX-WzreMMCPcUyBgpuRwzwd6gRBO2c"
}
```

**Confirm - Response**

The response will contain the confirmed transfer details and will return a new, longer **transferKey**.

It will also include the necessary fields to send in the Prebook.

This new **transferKey** will be used again to continue the booking flow.

```
"warnings": [],
   "requiredField": {
       "contactPerson": [
           "FIRST_NAME",
           "LAST_NAME",
           "ACADEMY_TITLE",
           "BIRTH_DATE",
           "PHONE",
           "EMAIL",
           "COUNTRY"
       ],
       "otherPersons": [
           "FIRST_NAME",
           "ACADEMY_TITLE",
           "BIRTH_DATE",
           "PHONE",
           "COUNTRY"
       ]
   },
   "transfer": {
       "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJzdGVwIjoiQ09ORklSTUVEIiwiZGVwYXJ0dXJlRGF0ZSI6WzIwMjYsMSwxNCwxNCwyNV0sInJlcXVlc3RlZEFycml2YWxEYXRlIjoiMjAyNi0wMS0xNCIsIm1hbnVhbEFycml2YWxEYXRlVGltZSI6IjIwMjYtMDEtMTRUMTQ6MDA6MDAiLCJyYXRlSWQiOiIxMDU2NjU0MDU0IiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjE0NzA3LCJuZXRQcmljZSI6eyJhbW91bnQiOjM0LjY4LCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6MzMuNjcsImN1cnJlbmN5IjoiRVVSIn0sImFycml2YWwiOnRydWUsImZyb21Ib3RlbCI6ZmFsc2UsInRvIjoiNDIxIiwiZnJvbSI6IkJDTiIsInBlcnNvbnNBZ2UiOlt7ImFnZSI6MzB9XSwibGFuZ3VhZ2UiOiJFTiIsInRyYW5zZmVyIjp7InByaWNlIjp7ImFtb3VudCI6MzMuNjcsImN1cnJlbmN5IjoiRVVSIn0sIm1heGltdW1XYWl0aW5nTWludXRlcyI6NDUsImNoYXJhY3RlcmlzdGljcyI6W10sImNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNS0xMi0xMiIsIm5ldFByaWNlIjp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI2LTAxLTEzIiwibmV0UHJpY2UiOnsiYW1vdW50IjozMi42OSwiY3VycmVuY3kiOiJFVVIifX1dLCJjb25maXJtZWRQaWNrdXBUaW1lIjp0cnVlLCJkZXBhcnR1cmVEYXRlIjoiMjAyNi0wMS0xNFQxNDoyNTowMCIsInRyYW5zZmVyVHlwZSI6IlNFREFOIiwicHJvZHVjdFR5cGUiOiJFQ09OT01ZIiwic2VydmljZVR5cGUiOiJQUklWQVRFIiwiYWRkaXRpb25hbENoYXJhY3RlcmlzdGljcyI6W10sIm9uUmVxdWVzdCI6ZmFsc2UsImltYWdlIjoiaHR0cHM6Ly9zdGF0aWMudHJhbnNmZXJ6LmNvbS92ZWhpY2xlLXR5cGVzL2Vjb25vbXktc2VkYW4uanBnIn0sInRyYW5zZmVyUmVxdWlyZWRGaWVsZENvbnRhY3QiOlsiRklSU1RfTkFNRSIsIkxBU1RfTkFNRSIsIkFDQURFTVlfVElUTEUiLCJCSVJUSF9EQVRFIiwiUEhPTkUiLCJFTUFJTCIsIkNPVU5UUlkiXSwidHJhbnNmZXJSZXF1aXJlZEZpZWxkT3RoZXJzIjpbIkZJUlNUX05BTUUiLCJBQ0FERU1ZX1RJVExFIiwiQklSVEhfREFURSIsIlBIT05FIiwiQ09VTlRSWSJdfQ.Mg4Cadl3AtuM2FMG85fn6L1Ai7jlI2vZP7h1PAT2XjU",
       "price": {
           "amount": 33.67,
           "currency": "EUR"
       },
       "maximumWaitingMinutes": 45,
       "characteristics": [
           "Vehicle models: Buick GL8, Toyota Allion, Toyota Prius Plus, Nissan Versa, Volkswagen Touran",
           "Maximum 3 large suitcases",
           "Maximum 3 passengers"
       ],
       "cancellationPolicies": [
           {
               "date": "2025-12-12",
               "netPrice": {
                   "amount": 0.0,
                   "currency": "EUR"
               }
           },
           {
               "date": "2026-01-13",
               "netPrice": {
                   "amount": 33.67,
                   "currency": "EUR"
               }
           }
       ],
       "confirmedPickupTime": true,
       "departureDate": "2026-01-14T14:25:00",
       "transferType": "SEDAN",
       "productType": "ECONOMY",
       "serviceType": "PRIVATE",
       "additionalCharacteristics": [],
       "onRequest": false,
       "image": "https://static.transferz.com/vehicle-types/economy-sedan.jpg"
   }
```

This operation creates a pre-reservation of the selected transfer.

**Prebook - Request**

To perform the prebook, the complete passenger distribution details are required.

Additionally, if there is any **transportBase** involved in the trip, it will be necessary to provide the flight number or identifying transport number by filling in either **arrivalTransportNumber** or **departureTransportNumber**, depending on whether it corresponds to the arrival or the departure.

Finally, include in the request the **transferKey** returned by the [confirm](#confirmtransfer) operation.

```
{
  "persons": [
    {
      "name": "Name",
      "lastName": "Surname",
      "requestedAge": 30,
      "birthDate": "1999-10-29",
      "documentNumber": "1232424n",
      "courtesyTitle": "MISTER",
      "email": "user@example.com",
      "phoneCountryCode": "+34",
      "phone": "689444444",
      "country": "Spain",
      "countryId": "ES"
    }
  ],
  "departureTransportNumber": "FR123",
    "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbERlcGFydHVyZURhdGVUaW1lIjpbMjAyNiwxLDEzLDEyLDBdLCJyYXRlSWQiOiJwcm92aWRlclRyYW5zZmVyQ29kZSUlIiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjI0ODcsIm5ldFByaWNlIjp7ImFtb3VudCI6OC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6Ny43NywiY3VycmVuY3kiOiJFVVIifSwiYXJyaXZhbCI6ZmFsc2UsImZyb21Ib3RlbCI6dHJ1ZSwidG8iOiJCQ04iLCJmcm9tIjoiNDIxIiwicGVyc29uc0FnZSI6W3siYWdlIjozMH1dLCJsYW5ndWFnZSI6IkVOIiwidHJhbnNmZXIiOnsicHJpY2UiOnsiYW1vdW50Ijo3Ljc3LCJjdXJyZW5jeSI6IkVVUiJ9LCJwaWNrdXBJbmZvcm1hdGlvbiI6IlBpY2t1cCBpbmZvIiwibWF4aW11bVdhaXRpbmdNaW51dGVzIjoxNSwiY2hhcmFjdGVyaXN0aWNzIjpbXSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7Im5ldFByaWNlIjp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNS0xMi0wMiJ9LHsibmV0UHJpY2UiOnsiYW1vdW50Ijo3Ljc3LCJjdXJyZW5jeSI6IkVVUiJ9LCJkYXRlIjoiMjAyNi0wMS0xMyJ9XSwiY29uZmlybWVkUGlja3VwVGltZSI6dHJ1ZSwiaW1hZ2UiOiJodHRwczovL3RyMnN0b3JhZ2UuYmxvYi5jb3JlLndpbmRvd3MubmV0L3RyYW5zZmVyaW1hZ2VzL3ByaXZhdGUtc2VkYW4uanBnIiwiZGVwYXJ0dXJlRGF0ZSI6IjIwMjYtMDEtMTNUMTI6MDAiLCJ0cmFuc2ZlclR5cGUiOiJTVVYiLCJwcm9kdWN0VHlwZSI6IlNQRUNJQUwiLCJzZXJ2aWNlVHlwZSI6IlBSSVZBVEUiLCJkZXBhcnR1cmVUaW1lIjoiMjAyNi0wMS0xM1QxMjowMCJ9fQ.VBqjnSR0W0ldST1mccUUjLM8K8e-QorLELLfL0Skd5I"
}
```

**Prebook - Response**

The response will include the passenger distribution provided in the request and an updated **transferKey**, which will be used to finalize the booking flow.

Prebook - Round trip - response

```
"warnings": [],
    "persons": [
        {
            "id": "",
            "name": "Name",
            "lastName": "Surname",
            "requestedAge": 30,
            "birthDate": "1999-05-24",
            "documentNumber": "1232424n",
            "courtesyTitle": "MISTER",
            "academyTitle": "DR",
            "email": "example@example.com",
            "phoneCountryCode": "+34",
            "phone": "689444444",
            "country": "Spain",
            "countryId": "ES"
        }
    ],
    "transfer": {
        "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJzdGVwIjoiUFJFQk9PS0VEIiwiZGVwYXJ0dXJlRGF0ZSI6WzIwMjYsMSwxNCwxNCwyNV0sInJlcXVlc3RlZEFycml2YWxEYXRlIjoiMjAyNi0wMS0xNCIsIm1hbnVhbEFycml2YWxEYXRlVGltZSI6IjIwMjYtMDEtMTRUMTQ6MDA6MDAiLCJyYXRlSWQiOiIxMDU2NjU0MDU0IiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjE0NzA3LCJuZXRQcmljZSI6eyJhbW91bnQiOjM0LjY4LCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6MzMuNjcsImN1cnJlbmN5IjoiRVVSIn0sImFycml2YWwiOnRydWUsImZyb21Ib3RlbCI6ZmFsc2UsInRvIjoiNDIxIiwiZnJvbSI6IkJDTiIsInBlcnNvbnMiOlt7ImlkIjoiIiwibmFtZSI6Ik5hbWUiLCJsYXN0TmFtZSI6IlN1cm5hbWUiLCJyZXF1ZXN0ZWRBZ2UiOjMwLCJiaXJ0aERhdGUiOiIxOTk5LTA1LTI0IiwiZG9jdW1lbnROdW1iZXIiOiIxMjMyNDI0biIsImNvdXJ0ZXN5VGl0bGUiOiJNSVNURVIiLCJhY2FkZW15VGl0bGUiOiJEUiIsImVtYWlsIjoiZXhhbXBsZUBleGFtcGxlLmNvbSIsInBob25lQ291bnRyeUNvZGUiOiIrMzQiLCJwaG9uZSI6IjY4OTQ0NDQ0NCIsImNvdW50cnkiOiJTcGFpbiIsImNvdW50cnlJZCI6IkVTIn1dLCJsYW5ndWFnZSI6IkVOIiwidHJhbnNmZXIiOnsicHJpY2UiOnsiYW1vdW50IjozMy42NywiY3VycmVuY3kiOiJFVVIifSwibWF4aW11bVdhaXRpbmdNaW51dGVzIjo0NSwiY2hhcmFjdGVyaXN0aWNzIjpbXSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI1LTEyLTEyIiwibmV0UHJpY2UiOnsiYW1vdW50IjowLjAsImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjYtMDEtMTMiLCJuZXRQcmljZSI6eyJhbW91bnQiOjMxLjc0LCJjdXJyZW5jeSI6IkVVUiJ9fV0sImNvbmZpcm1lZFBpY2t1cFRpbWUiOnRydWUsImRlcGFydHVyZURhdGUiOiIyMDI2LTAxLTE0VDE0OjI1OjAwIiwidHJhbnNmZXJUeXBlIjoiU0VEQU4iLCJwcm9kdWN0VHlwZSI6IkVDT05PTVkiLCJzZXJ2aWNlVHlwZSI6IlBSSVZBVEUiLCJhcnJpdmFsVHJhbnNwb3J0TnVtYmVyIjoiRlIxMjMiLCJhZGRpdGlvbmFsQ2hhcmFjdGVyaXN0aWNzIjpbXSwib25SZXF1ZXN0IjpmYWxzZSwiaW1hZ2UiOiJodHRwczovL3N0YXRpYy50cmFuc2ZlcnouY29tL3ZlaGljbGUtdHlwZXMvZWNvbm9teS1zZWRhbi5qcGcifX0.WCulvN8y3oi4lexIDrmNj5nfQL7I-kVPPaqLxbpn3Fs",
        "price": {
            "amount": 33.67,
            "currency": "EUR"
        },
        "maximumWaitingMinutes": 45,
        "characteristics": [],
        "cancellationPolicies": [
            {
                "date": "2025-12-12",
                "netPrice": {
                    "amount": 0.0,
                    "currency": "EUR"
                }
            },
            {
                "date": "2026-01-13",
                "netPrice": {
                    "amount": 31.74,
                    "currency": "EUR"
                }
            }
        ],
        "confirmedPickupTime": true,
        "departureDate": "2026-01-14T14:25:00",
        "transferType": "SEDAN",
        "productType": "ECONOMY",
        "serviceType": "PRIVATE",
        "arrivalTransportNumber": "FR123",
        "additionalCharacteristics": [],
        "onRequest": false,
        "image": "example.jpg"
    }
}
```

This operation creates a reservation of the the selected transfer. Some considerations:

\- The **fakeBooking** attribute is optional. If not sent, the reservation will be closed as BOOKED in the test environment or with the actual state returned by the vendor in the production environment. This attribute is useful if you want to simulate an error, in which case you can send BOOK\_ERROR. Keep in mind that with the **fakeBooking** attribute the reservation will not be persisted in the Travelcompositor system or sent to suppliers if it is in a production environment.

\- The **externalReference** attribute is optional. It can be used to save the customer's reference and thus link it to the generated reservation.

**Book - Request**

\- The transferKey returned in the [prebook](#prebooktransfer) operation response must be sent

```
{
    "transferKey": "eyJhbGciOiJIUzI1NiJ9.eyJkZXBhcnR1cmVEYXRlIjpbMjAyNiwxLDEzLDEyLDBdLCJyZXF1ZXN0ZWRBcnJpdmFsRGF0ZSI6WzIwMjYsMSwxM10sIm1hbnVhbERlcGFydHVyZURhdGVUaW1lIjpbMjAyNiwxLDEzLDEyLDBdLCJyYXRlSWQiOiJwcm92aWRlclRyYW5zZmVyQ29kZSUlIiwicHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjI0ODcsIm5ldFByaWNlIjp7ImFtb3VudCI6OC4wLCJjdXJyZW5jeSI6IkVVUiJ9LCJ0b3RhbFByaWNlIjp7ImFtb3VudCI6Ny43NywiY3VycmVuY3kiOiJFVVIifSwiYXJyaXZhbCI6ZmFsc2UsImZyb21Ib3RlbCI6dHJ1ZSwidG8iOiJCQ04iLCJmcm9tIjoiNDIxIiwicGVyc29uc0FnZSI6W3siYWdlIjozMH1dLCJwZXJzb25zIjpbeyJpZCI6IiIsIm5hbWUiOiJOYW1lIDEiLCJsYXN0TmFtZSI6IlN1cm5hbWUgMSIsInJlcXVlc3RlZEFnZSI6MzAsImRvY3VtZW50TnVtYmVyIjoiMTIzMjQyNG4iLCJjb3VydGVzeVRpdGxlIjoiTUlTVEVSIiwiZW1haWwiOiIiLCJwaG9uZUNvdW50cnlDb2RlIjoiIiwicGhvbmUiOiIifV0sImxhbmd1YWdlIjoiRU4iLCJ0cmFuc2ZlciI6eyJwcmljZSI6eyJhbW91bnQiOjcuNzcsImN1cnJlbmN5IjoiRVVSIn0sInBpY2t1cEluZm9ybWF0aW9uIjoiUGlja3VwIGluZm8iLCJtYXhpbXVtV2FpdGluZ01pbnV0ZXMiOjE1LCJjaGFyYWN0ZXJpc3RpY3MiOltdLCJjYW5jZWxsYXRpb25Qb2xpY2llcyI6W3sibmV0UHJpY2UiOnsiYW1vdW50IjowLjAsImN1cnJlbmN5IjoiRVVSIn0sImRhdGUiOiIyMDI1LTEyLTAyIn0seyJuZXRQcmljZSI6eyJhbW91bnQiOjcuNzcsImN1cnJlbmN5IjoiRVVSIn0sImRhdGUiOiIyMDI2LTAxLTEzIn1dLCJjb25maXJtZWRQaWNrdXBUaW1lIjp0cnVlLCJpbWFnZSI6Imh0dHBzOi8vdHIyc3RvcmFnZS5ibG9iLmNvcmUud2luZG93cy5uZXQvdHJhbnNmZXJpbWFnZXMvcHJpdmF0ZS1zZWRhbi5qcGciLCJkZXBhcnR1cmVEYXRlIjoiMjAyNi0wMS0xM1QxMjowMCIsInRyYW5zZmVyVHlwZSI6IlNVViIsInByb2R1Y3RUeXBlIjoiU1BFQ0lBTCIsInNlcnZpY2VUeXBlIjoiUFJJVkFURSIsImRlcGFydHVyZVRpbWUiOiIyMDI2LTAxLTEzVDEyOjAwIiwiZGVwYXJ0dXJlVHJhbnNwb3J0TnVtYmVyIjoiIn19.B4dvKF-OGZZH94Aak2vE_bZCyeO9_Ffgce9oZT2L0Jw",
    "externalReference": "external reference"
}
```

**Book response**

The response will return the general booking and transfer details, including the **status**, the **bookingReference** for both the booking and the transfer, and the **transfer departure time**.

```
"bookingReference": "TST-8334",
    "externalReference": "external reference",
    "status": "BOOKED",
    "transfer": {
        "bookingReference": "TST-8473-1-0",
        "serviceStatus": "BOOKED",
        "voucherURL": "exampleURL",
        "price": {
            "amount": 33.67,
            "currency": "EUR"
        },
        "maximumWaitingMinutes": 45,
        "characteristics": [],
        "cancellationPolicies": [
            {
                "date": "2025-12-12",
                "netPrice": {
                    "amount": 0.0,
                    "currency": "EUR"
                }
            },
            {
                "date": "2026-01-13",
                "netPrice": {
                    "amount": 31.74,
                    "currency": "EUR"
                }
            }
        ],
        "confirmedPickupTime": true,
        "departureDate": "2026-01-14T14:25:00",
        "transferType": "SEDAN",
        "productType": "ECONOMY",
        "serviceType": "PRIVATE",
        "arrivalTransportNumber": "FR123",
        "additionalCharacteristics": [],
        "onRequest": false,
        "image": "example.jpg"
}
```

This operation allows you to recover the cancellation fees of a transfer reservation on the day and time that the query is made. To cancel the reservation you should use the [Cancel](#canceltransfer) operation.

```
curl --location 'https://{{endpoint}}/resources/booking/transfer/cancellation-fee/{{bookingReference}}/{{transferBookingReference}}' \
--header 'accept: application/json' \
--header 'auth-token: {{authToken}}' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data ''
```

```
"cancellationFee": {
        "amount": 0.0,
        "currency": "EUR"
    }
```

This operation allows the cancellation of a transfer reservation. To recover cancellation fees you can use the [Cancellation fees](#cancellationfeestransfer) operation.

```
curl --location --request DELETE '{{endpoint}}/resources/booking/transfer/{{bokingReference}}/{{transferBookingReference}}' \
--header 'accept: application/json' \
--header 'auth-token: {{authToken}}' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data ''
```

```
"bookingReference": "TST-8473",
    "externalReference": "external reference",
    "status": "CANCELED",
    "transfer": {
        "bookingReference": "TST-8473-1-0",
        "serviceStatus": "CANCELED",
        "voucherURL": "exampleURL",
        "price": {
            "amount": 33.67,
            "currency": "EUR"
        },
        "maximumWaitingMinutes": 45,
        "characteristics": [],
        "cancellationPolicies": [
            {
                "date": "2025-12-12",
                "netPrice": {
                    "amount": 0.0,
                    "currency": "EUR"
                }
            },
            {
                "date": "2026-01-13",
                "netPrice": {
                    "amount": 31.74,
                    "currency": "EUR"
                }
            }
        ],
        "confirmedPickupTime": true,
        "departureDate": "2026-01-14T14:25:00",
        "transferType": "SEDAN",
        "productType": "ECONOMY",
        "serviceType": "PRIVATE",
        "additionalCharacteristics": [],
        "onRequest": false,
        "image": "example.jpg"
    }
```

This operation allows you to update the reservation with the latest information that the reservation provider has. An example of use would be: if a transfer reservation has been closed with status 'On Request', you can use this operation to check if the status has been updated.

```
curl --location --request PUT '{{endpoint}}/resources/booking/transfer/{{bookingReference}}/{{transferBookingReference}}' \
--header 'accept: application/json' \
--header 'auth-token: {{authToken}}' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data ''
```

```
"bookingReference": "TST-8473",
    "externalReference": "external reference",
    "status": "BOOKED",
    "transfer": {
        "bookingReference": "TST-8473-1-0",
        "serviceStatus": "BOOKED",
        "voucherURL": "exampleURL",
        "price": {
            "amount": 33.67,
            "currency": "EUR"
        },
        "maximumWaitingMinutes": 45,
        "characteristics": [],
        "cancellationPolicies": [
            {
                "date": "2025-12-12",
                "netPrice": {
                    "amount": 0.0,
                    "currency": "EUR"
                }
            },
            {
                "date": "2026-01-13",
                "netPrice": {
                    "amount": 31.74,
                    "currency": "EUR"
                }
            }
        ],
        "confirmedPickupTime": true,
        "departureDate": "2026-01-14T14:25:00",
        "transferType": "SEDAN",
        "productType": "ECONOMY",
        "serviceType": "PRIVATE",
        "additionalCharacteristics": [],
        "onRequest": false,
        "image": "example.jpg"
    }
```

This operation allows you to retrieve the details of a reservation from the **bookingReference** of the reservation and the **bookingReference** of any service. This operation does not make any calls to the transfer provider and only retrieves the data that is in Travel Compositor.

```
curl --location '{{endpoint}}/resources/booking/transfer/{{bookingReference}}/{{transferBookingReference}}' \
--header 'accept: application/json' \
--header 'auth-token: {{authToken}}' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data ''
```

```
"bookingReference": "TST-8473",
   "externalReference": "external reference",
   "status": "CANCELED",
   "transfer": {
       "bookingReference": "TST-8473-1-0",
       "serviceStatus": "CANCELED",
       "voucherURL": "exampleURL",
       "price": {
           "amount": 33.67,
           "currency": "EUR"
       },
       "maximumWaitingMinutes": 45,
       "characteristics": [],
       "cancellationPolicies": [
           {
               "date": "2025-12-12",
               "netPrice": {
                   "amount": 0.0,
                   "currency": "EUR"
               }
           },
           {
               "date": "2026-01-13",
               "netPrice": {
                   "amount": 31.74,
                   "currency": "EUR"
               }
           }
       ],
       "confirmedPickupTime": true,
       "departureDate": "2026-01-14T14:25:00",
       "transferType": "SEDAN",
       "productType": "ECONOMY",
       "serviceType": "PRIVATE",
       "additionalCharacteristics": [],
       "onRequest": false,
       "image": "example.jpg"
   }
```

## 1\. What\`s the transfer data format (XML / JSON)?

Only JSON.

## 2\. Does it support gzip?

Yes, is mandatory.

## 3\. Is there any limit on the Max No. of passengers?

54 travellers.

## 4\. Does it support child or not? Age range?

Yes, it is supported. Children's age range goes form 2 till 17 years old (inclusive). Infant's age range goes from 0 till 1 years old (inclusive).

## 8\. In the pre book step,will you provide cache rate or real rate?

Depending on connected providers, normally this does not happen. We are a supplier hub.

## 9\. Can we specify the currency in which we want the results in the availability request? If not, is it possible that we have different currencies in the different recommendations?

No, always will be returned the currency which is set up at microsite configuration and always will be the same.

## 10\. Which is the certification procees to follow?

We will ask you for the request and response of all the calls to verify that the calls are being made correctly. It shouldn't take more than a few days. Ideally, if it were possible to have a staging site to test the flow, that would be great, but it's not required.

We will also request:

Four bookings covering all possible cases:

• **Transfer IN** from a **transportBase** to a **hotel** with 1 adult.

• **Transfer IN** from a **hotel** to another **hotel** with 2 adults and 2 childs

• **Transfer OUT** from a **hotel** to a **transportBase** with 5 adults

• **Transfer OUT** from one **transportBase** to another with 4 adults and 3 childs

## 11\. Which booking statuses can be found in your system?

Our system handles statuses at two levels: **booking status** and **service status**. The booking status is calculated from the statuses of the services included in the booking.

**Service statuses:**  
\- **BOOKED** - Service confirmed successfully.  
\- **BOOK\_ERROR** - An error occurred while booking or closing the service.  
\- **CANCELED** - Canceled service.  
\- **PRICE\_ERROR** - The service was booked, but a price change was detected when closing it with the provider. The tolerance to return **BOOKED** can be configured in Microsite Settings. If no value is configured, the system default tolerance is applied.  
\- **NOT\_BOOKED** - The service was not confirmed by the provider.  
\- **RQ** - Service on request, pending provider confirmation.  
\- **PENDING\_BOOK** - The service is still in the booking process.

**Booking statuses:**  
\- **NOT\_BOOKED** - The booking is considered not booked, typically when all services ended in non-confirmed statuses such as **BOOK\_ERROR** or **NOT\_BOOKED**.  
\- **RQ** - At least one service is in **RQ**.  
\- **PRICE\_ERROR** - At least one service has a price change error.  
\- **PENDING\_BOOK** - At least one service is still in **PENDING\_BOOK**.  
\- **BOOKED** - All services are in **BOOKED** and there is no previous booking error condition.  
\- **BOOK\_ERROR** - Fallback status when the booking is not fully confirmed and none of the previous cases apply.  
\- **CANCELED** - Canceled booking.

**11.Can child seats or other extras be requested?**

*Feature coming soon*

TravelC Closed Tour API is designed to provide a set of API calls to bring tour distribution to any website or device:

The TravelC Closed Tour API suite is divided into 3 parts:

\- **Booking flow**

\- **Static content**

\- **Post-booking**

The number of tours available will depend on the providers connected by the customer.

Use our Postman collection to test our APIs now and familiarize yourself with them:

[Postman](https://online.travelcompositor.com/resources/api-closedtour/TravelC_Api_ClosedTour.postman_collection.json)

If you don't have credentials yet, check out our [Getting started](https://online.travelcompositor.com/api/documentation/index.xhtml#intro) section to help you understand how to get started with the TravelC API

All API responses always return an audit object that the support team might request to trace requests.

```
"auditData": {
                                    "timestamp": "2022-11-15 09:05:14",
                                    "processTime": 69,
                                    "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
                                    "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
                                    "availabilityId": 946,
                                    "server": "http://travelc-host-xxxx:xxxxx"
                                }
```

Below we show a flowchart with the steps necessary to complete a reservation through the API. Then we will explain each of the steps:

![](https://online.travelcompositor.com/resources/images/api-documentation/booking-closed-tour-flow.png)

With this operation we will obtain a paginated list of our closed tours, each of them with a short summary of the data of each tour.This list can be filtered using the following parameters:

\- **country**: With this parameter we can filter by country. For example ES for Spain

\- **nights**: With this parameter we can filter by number of nights of the closed tour.

\- **month**: With this parameter we can filter by the starting month of the closed tour.

\- **destination**: With this parameter we can filter by the starting destination of the closed tour.

\- **first**: With this parameter we can indicate the index of the first closed tour of the list to be received.

\- **list**: With this parameter we can indicate the number of closed tours to be received in the list.

```
{
  "country": "ES",
  "nights": 10,
  "month": "JANUARY",
  "destination": "MAD",
  "first": 0,
  "limit": 10
}
```

```
{
    "auditData": {
        "timestamp": "2024-12-02 14:26:20",
        "processTime": 555,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMTUzMTQwLCJqdGkiOiJFREI2OUEwQS1BREI3LTRDRjktQkJENS04OEU2RDc0NzQzRkYifQ.hmaj0oZScArYY8K3RZq-333C7cCcJEIc0TTgPjTYO0-sSL46wuWY6ldCyRCe6A07RSJtbqOw7zqZweHK562J3g",
        "traceId": "EDB69A0A-ADB7-4CF9-BBD5-88E6D74743FF",
        "server": "http://localhost:30000"
    },
    "pagination": {
        "firstResult": 0,
        "pageResults": 10,
        "totalResults": 49
    },
    "closedTours": [
        {
            "serviceId": "PKG-30969468-1",
            "title": "Euro- Helenico con crucero INT (2025)",
            "destinations": "Madrid | San Sebastian | Bordeaux | Chambord | Paris | Dijon | Beaune | Lyon | Geneva | Milan | Venice | Ravenna, Emilia-Romagna | Assisi | Rome | Athens | Kamena Vourla | Kalambaka | Delphi | Mykonos | Kusadasi | Patmos | Heraklion | Santorini Island",
            "fromDate": "2025-04-01",
            "transports": 0,
            "nights": 20,
            "hotels": 9,
            "activities": 0,
            "pricePerPerson": {
                "amount": 4332.13,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-31297003-1",
            "title": "Journeys: The Great Southern Africa Safari",
            "destinations": "Cape Town | Johannesburg | Kruger National Park | Victoria falls | Hwange | Kasane | Okavango Delta | Maun",
            "fromDate": "2024-12-09",
            "transports": 0,
            "nights": 20,
            "hotels": 9,
            "activities": 0,
            "pricePerPerson": {
                "amount": 4999.5,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-6798547-3",
            "title": "Classic Safari Nyota en 4x4 Kenia and Tanzania 2019",
            "destinations": "Cairo | Luxor | Nairobi | Maasai Mara | Victoria falls | Serengeti (Tanzania) | Ngorongoro | Arusha | Zanzibar Archipelago",
            "fromDate": "2024-12-04",
            "transports": 11,
            "nights": 20,
            "hotels": 11,
            "activities": 2,
            "pricePerPerson": {
                "amount": 5481.12,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-30118233-1",
            "title": "Northern and Southern China end Hong Kong (2024)",
            "destinations": "Beijing | Qufu city Shandong | Xuzhou | Nanjing | Suzhou | Tongliao | Shanghai | Luoyang | Xi'an | Chengdu | Zhaoxing | Canton (Guangzhou) | Qingdao | Guilin | Yangshuo | Huangyao | Zhuhai, Macao | Macau | Hong Kong",
            "fromDate": "2024-12-02",
            "transports": 0,
            "nights": 20,
            "hotels": 13,
            "activities": 0,
            "pricePerPerson": {
                "amount": 5256.13,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-30117619-1",
            "title": "Essences of Iran: From the Caspian Sea to Persepolis Fin Yazd (2024)",
            "destinations": "Teheran (Tehran) | Qazvin | Rasht | Bandar-e Anzali | Ardebil | Sareyn ( سرعین ) | Tabriz | Jolfa | Khoy | Urmia | Naqadeh | Mahabad | Sanandaj | Hamadan | Qom | Kashan | Abyaneh | Isfahan | Abadeh | Shiraz | Marvdasht | Shahr-e Babak | Rafsanjan | Mahan | Kerman | Mehriz | Yazd | Nain",
            "fromDate": "2024-12-11",
            "transports": 0,
            "nights": 20,
            "hotels": 7,
            "activities": 0,
            "pricePerPerson": {
                "amount": 2508.43,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-31297232-1",
            "title": "Best of New Zealand: Mountain Biking and Black-Sand Beaches",
            "destinations": "Auckland | Raglan | Rotorua | Taupo | Wellington | Marahau | Westport | Franz Josef | Queenstown | Lake Tekapo | Christchurch | Kaikoura",
            "fromDate": "2024-12-02",
            "transports": 0,
            "nights": 20,
            "hotels": 0,
            "activities": 0,
            "pricePerPerson": {
                "amount": 1599.5,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-31297236-1",
            "title": "Absolute Peru",
            "destinations": "Lima | Paracas | Nazca | Arequipa | Colca Canyon | Puno | Lake Titicaca | Cusco | Sacred Valley | Wayllabamba | Machu Picchu | Puerto Maldonado",
            "fromDate": "2024-12-02",
            "transports": 0,
            "nights": 20,
            "hotels": 0,
            "activities": 0,
            "pricePerPerson": {
                "amount": 1899.5,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-31023556-1",
            "title": "Jerusalem, Jordan and Secrets of the Nile with Alexandria (2024)",
            "destinations": "Jerusalem | Jerico | Jerash | Amman | Madaba | Mount Nebo | Dead Sea, Jordan | Shawbak | Petra, Wadi Musa | Wadi Rum | Aqaba | Eilat | Saint Catharine | Cairo | Aswan | Kom Ombo | Edfu | Esna | Luxor | Dendera | Hurghada | Zaafarana | Suez | Alexandria",
            "fromDate": "2024-12-02",
            "transports": 0,
            "nights": 20,
            "hotels": 12,
            "activities": 0,
            "pricePerPerson": {
                "amount": 5279.48,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-31296871-1",
            "title": "Thailand and Vietnam: Mountains and Coastlines",
            "destinations": "Bangkok | Sai Yok, Kanchanaburi | Sukhothai | Chiang Mai | Hanoi | Vinh | Phong Nha | Hue | Hoi An | Quy Nhon | Nha Trang | Phan Thiet | Ho Chi Minh (Saigon)",
            "fromDate": "2024-12-02",
            "transports": 0,
            "nights": 20,
            "hotels": 14,
            "activities": 0,
            "pricePerPerson": {
                "amount": 789.5,
                "currency": "EUR"
            }
        },
        {
            "serviceId": "PKG-30837934-1",
            "title": "Tokio, Monte Fuji y China de Norte a Sur - Fin Hong Kong (2025)",
            "destinations": "Tokyo | Kamakura | Odawara | Hakone | Fujikawaguchiko | Kawaguchiko | Beijing | Shanghai | Luoyang | Xi'an | Chengdu | Zhaoxing | Canton (Guangzhou) | Qingdao | Guilin | Yangshuo | Huangyao | Zhuhai, Macao | Macau | Hong Kong",
            "fromDate": "2025-04-18",
            "transports": 0,
            "nights": 20,
            "hotels": 2,
            "activities": 0,
            "pricePerPerson": {
                "amount": 6110.11,
                "currency": "EUR"
            }
        }
    ]
}
```

**Search ClosedTour - Response**

The search response has the following structure.

**Pagination**

This node contains the data concerning the pagination of the results.

\- **firstResult**: This parameter represents the index of the first result presented.

\- **pageResults**: This parameter represents the total of results presented in the response.

\- **totalResult**: This parameter represents the total number of items in the filtered results.

**Closed Tours**

This node contains the list of the closed tours.  
Every item in list contains:

\- **serviceId**: This parameter represents the identifier of the closed tour that you can book or get all closed tour data.

\- **destinations**: This parameter contains the name of the different destinations of the closed tour itinerary.

\- **fromDate**: This parameter represents the first bookable date of the closed tour.

\- **transports**: This parameter represents the quantity of transports in the closed tour.

\- **hotels**: This parameter represents the quantity of hotels in the closed tour.

\- **activities**: This parameter represents the quantity of activities in the closed tour.

\- **nights**: This parameter represents the duration of the closed tour in nights.

With this operation we will obtain the tour data sheet using the closed tour service identifier.

\- **lang**: With this mandatory parameter we will indicate which closed tour service language we want his datasheet for.

\- **closedTourId** : With this mandatory parameter we will indicate which closed tour service we want his data for.

```
curl --location --request GET 'http://default.localhost/resources/closedtour/en/PKG-31296976-1' \
  --header 'accept: application/json' \
  --header 'Accept-Encoding: gzip' \
  --header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjI3NTA0LCJqdGkiOiIzNjdDMjhDQS00ODlELTQzNzktQUU3NS00Qzc3MkE4OUY3MUEifQ.5CQ__52TJccP6P5_5mz1TIYkHe-AvjwZskbMgSdbXslvQvHky3X9lqMt1CXG1Bk7fNyvzKthk7nxxD59IXWd3g'
```

```
{
    "auditData": {
        "timestamp": "2024-12-03 11:10:42",
        "processTime": 95,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjI3NTA0LCJqdGkiOiIzNjdDMjhDQS00ODlELTQzNzktQUU3NS00Qzc3MkE4OUY3MUEifQ.5CQ__52TJccP6P5_5mz1TIYkHe-AvjwZskbMgSdbXslvQvHky3X9lqMt1CXG1Bk7fNyvzKthk7nxxD59IXWd3g",
        "traceId": "367C28CA-489D-4379-AE75-4C772A89F71A",
        "server": "http://localhost:30000"
    },
    "closedTour": {
        "id": 16440581,
        "title": "Journeys: Kenya Safari Experience",
        "largeTitle": "Journeys: Kenya Safari Experience",
        "description": "",
        "remarks": "Select the language of activity",
        "imageUrl": "https://betamedia.gadventures.com/media-server/cache/ed/0a/ed0a9d60a47b9e74185ad46f418f36f9.jpg",
        "creationDate": "2024-11-22",
        "departureDate": "2025-02-16",
        "ideaUrl": "",
        "externalReference": "GAD-23745",
        "themes": [],
        "pricePerPerson": {
            "amount": 2099.5,
            "currency": "EUR"
        },
        "totalPrice": {
            "amount": 4199.0,
            "currency": "EUR"
        },
        "ribbonText": "holiday package",
        "destinations": [
            {
                "code": "NAI",
                "name": "Nairobi"
            },
            {
                "code": "LEK",
                "name": "Nakuru"
            },
            {
                "code": "LAV",
                "name": "Naivasha"
            },
            {
                "code": "MAS",
                "name": "Maasai Mara"
            },
            {
                "code": "NAI",
                "name": "Nairobi"
            }
        ],
        "userB2c": false,
        "origin": {},
        "dateSettings": {
            "availRange": {
                "start": "2024-12-15",
                "end": "2025-09-09"
            },
            "operationDays": {
                "sunday": true,
                "monday": true,
                "tuesday": true,
                "wednesday": true,
                "thursday": true,
                "friday": true,
                "saturday": true
            },
            "releaseDays": 0,
            "departurePrices": {
                "currency": "EUR",
                "holidayPackagesDates": [
                    {
                        "date": "2024-12-15",
                        "price": 2519.5
                    },
                    {
                        "date": "2024-12-22",
                        "price": 2519.5
                    },
                    {
                        "date": "2024-12-29",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-01-04",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-01-05",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-01-12",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-01-18",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-01-19",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-01-26",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-02-01",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-02-02",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-02-09",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-02-15",
                        "price": 2184.5
                    },
                    {
                        "date": "2025-02-16",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-03-09",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-03-23",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-04-20",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-05-04",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-05-11",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-05-17",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-05-18",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-05-25",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-05-31",
                        "price": 2099.5
                    },
                    {
                        "date": "2025-06-01",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-08",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-14",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-15",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-21",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-22",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-28",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-06-29",
                        "price": 2399.5
                    },
                    {
                        "date": "2025-07-05",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-06",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-12",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-13",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-15",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-19",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-20",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-22",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-26",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-07-27",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-08-10",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-08-12",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-08-17",
                        "price": 2519.5
                    },
                    {
                        "date": "2025-09-06",
                        "price": 2269.5
                    },
                    {
                        "date": "2025-09-09",
                        "price": 2269.5
                    }
                ]
            },
            "stopSales": []
        },
        "order": 10,
        "externalProvider": "GADVENTURES",
        "supplierName": "G Adventures",
        "included": "Your Journeys Highlight Moment: Kenya Wildlife Service Conservation Talk, Lake Nakuru National Park\nYour Journeys Highlight Moment: Café Ubuntu and Ubuntu Made, Maai Mahiu. Arrival transfer. Entrances and wildlife safari drives in Masai Mara National Reserve, and Lake Nakuru National Park. Boat trip on Lake Naivasha and wildlife walk on Crescent Island. All transport between destinations and to/from included activities. Breakfast x 7 Lunch x 6 Dinner x 5",
        "hotels": "Sarova Panafric Hotel Sarova Lion Hill Game Lodge Lake Naivasha Crescent Camp Fig Tree Camp",
        "itinerarySegments": [
            {
                "title": "Day 1: Nairobi",
                "description": "Arrive at any time. Arrival transfer is included. Our trips throughout Kenya and Tanzania have a maximum group size of six travellers in addition to a CEO and a driver who are both trained safari guides. That means everyone gets a window seat and twice the insight about the astounding wildlife all around you. Arrival Day and Welcome Meeting: The adventure begins tonight. Feel free to explore before your welcome meeting, but make sure you’re back in time to meet the group. Check for the meeting time on the welcome note at the hotel. After introductions, your CEO will review the details of your tour.  Please note that normal check-in times apply at our start hotels, but you can usually store your luggage for the day if you arrive early.",
                "destination": [
                    {
                        "name": "Nairobi",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/GcHqDu3R6a5j-ffz1cpBUXzjpeg.jpeg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict4.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -1.292066,
                            "longitude": 36.821946
                        },
                        "recommendedAirportCode": "NBO",
                        "recommendedAirportName": "Jomo Kenyatta International",
                        "moreInfoUrl": "https://en.wikipedia.org/wiki/Kisumu"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 2: Nairobi/Lake Nakuru National Park",
                "description": "Depart early for Lake Nakuru, known for harbouring flocks of pink flamingos and a rich variety of bird species. Arrive at our safari lodge inside Lake Nakuru National Park in time for lunch, and seek out the resident rhinos on a late afternoon wildlife drive. Lake Nakuru Wildlife Safari Drive: Search for, buffalo, impalas, hyenas, and even lions and leopards on the wildlife safari drive in this renowned national park. Head to the shores of Lake Nakuru to see pelicans and cormorants. The park is also rich in other bird life, including grebes, white winged black terns, stilts, avocets, and ducks.Get a better view and take better snapshots aboard this off-road ride. Meal plan: BREAKFAST, LUNCH, DINNER",
                "destination": [
                    {
                        "name": "Nairobi",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/GcHqDu3R6a5j-ffz1cpBUXzjpeg.jpeg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict4.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -1.292066,
                            "longitude": 36.821946
                        },
                        "recommendedAirportCode": "NBO",
                        "recommendedAirportName": "Jomo Kenyatta International",
                        "moreInfoUrl": "https://en.wikipedia.org/wiki/Kisumu"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 3: Lake Nakuru National Park",
                "description": "Set out on morning and afternoon safaris through the picturesque park, searching for buffalo, impalas, lions, and more; and drive along the salty shores of Lake Nakuru to discover a mind-boggling variety of birds. Lake Nakuru Wildlife Safari Drive: Search for, buffalo, impalas, hyenas, and even lions and leopards on the wildlife safari drive in this renowned national park. Head to the shores of Lake Nakuru to see pelicans and cormorants. The park is also rich in other bird life, including grebes, white winged black terns, stilts, avocets, and ducks.: Get a better view and take better snapshots aboard this off-road ride.Meal plan: BREAKFAST, LUNCH, DINNER",
                "destination": [
                    {
                        "name": "Nakuru",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict1.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict4.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -0.3,
                            "longitude": 36.066667
                        },
                        "recommendedAirportCode": "KEY",
                        "recommendedAirportName": "Kericho",
                        "moreInfoUrl": "https://en.wikipedia.org/wiki/Nakuru"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 4: Lake Nakuru National Park/Lake Naivasha",
                "description": "This morning attend a talk given by a representative of the Kenya Wildlife Service (KWS)—a government institution dedicated to managing the country’s wildlife—about the issues surrounding poaching and wildlife conservation. Later head south through the Great Rift Valley to Lake Naivasha, a large freshwater lake surrounded by grassy banks and olive trees. Cruise the lake on a boat, watching for hippos and buffalo; and peer through your binoculars to spot lovebirds, ibis, and the African fish eagle. Step ashore at Crescent Island—a peaceful wildlife sanctuary located in the middle of the lake— and enjoy a guided stroll in search of wildebeest, zebras, and giraffes. The name Naivasha comes from the Maasai “Nai’posha”, which means “rough water”, though Lake Naivasha is generally calm as we watch for hippos and birdlife. Bring your binoculars and scan for lovebirds, ibis, and fish eagles, watch buffaloes wallow in the swamps and listen to colobus monkeys call from the treetops. Kenya Wildlife Service Conservation Talk: Gain a deeper understanding of the issues surrounding poaching and Elephant conservation during a lecture by an accredited speaker from the Kenya Wildlife Service (KWS). The major topics will be Elephants, martial Eagles and Pangolins and how they conduct animal census. The KWS strives to sustainably conserve and develop Kenya’s wildlife and its habitats, as well as create programs to enable communities living in wildlife areas to benefit from wildlife revenue. National Geographic has supported many research projects working jointly with KWS researchers in the field. The chairman of the KWS is renowned conservationist Walter Raria Kaipaton.Get a better view and take better snapshots aboard this off-road ride. Meal plan: BREAKFAST, LUNCH, DINNER",
                "destination": [
                    {
                        "name": "Nakuru",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict1.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict4.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/Nakuru/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -0.3,
                            "longitude": 36.066667
                        },
                        "recommendedAirportCode": "KEY",
                        "recommendedAirportName": "Kericho",
                        "moreInfoUrl": "https://en.wikipedia.org/wiki/Nakuru"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 5: Lake Naivasha/Masai Mara",
                "description": "Travel to the legendary Masai Mara National Reserve and settle into our comfortable tented camp, located in the heart of the reserve. Head out for an afternoon safari through vast, acacia-dotted plains, driving past throngs of wildebeest, zebra, and giraffes; and keep an eye out for lions, elephants, and the rest of the African “big five.” In the evening, relax at the camp and enjoy scenic views of the rolling plains. After breakfast, we depart for the world famous Masai Mara National Reserve. No trip to Kenya would be complete without a visit here. In the afternoon, we will arrive in the area, and get settled at our safari camp, our base for our time here. Then we’ll make our way into the reserve for an afternoon wildlife safari drive, with excellent chances of seeing the \"big five\": buffalo, elephant, leopard, lion, and rhino. Maasai Mara Wildlife Safari Drive: Maasai Mara is one of the world’s top safari destinations, known for its abundance of big cats – cheetahs, leopards and lions – as well as the two million wildebeest, Thomson’s gazelles and zebra that migrate annually across the vast grasslands in search of water. Set off on safari with our driver/guide and keep your eyes and ears peeled for movement and memories. Watch elephants and giraffe grazing, photograph zebras and wildebeest and, with a little luck, you'll even spot animals feasting on a recent kill. Get a better view and take better snapshots aboard this off-road ride. Meal plan: BREAKFAST, LUNCH, DINNER",
                "destination": [
                    {
                        "name": "Naivasha",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenya/naivasha/pict1.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenya/naivasha/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenya/naivasha/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenya/naivasha/pict4.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenya/naivasha/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenya/naivasha/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -0.768528,
                            "longitude": 36.350644
                        },
                        "recommendedAirportCode": "WIL",
                        "recommendedAirportName": "Nairobi Wilson",
                        "moreInfoUrl": "https://en.wikivoyage.org/wiki/Naivasha"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 6: Masai Mara",
                "description": "Venture out on an early morning safari to track the animals that traversed the savanna during the night. View ungulates like Thomson’s and Grant’s gazelles, topi and eland antelopes—as well as their stealthy predators—at one of their most active times of the day. Continue your exploration on a late afternoon safari, discovering the timeless landscapes of Masai Mara. Maasai Mara Wildlife Safari Drive: Maasai Mara is one of the world’s top safari destinations, known for its abundance of big cats – cheetahs, leopards and lions – as well as the two million wildebeest, Thomson’s gazelles and zebra that migrate annually across the vast grasslands in search of water. Set off on safari with our driver/guide and keep your eyes and ears peeled for movement and memories. Watch elephants and giraffe grazing, photograph zebras and wildebeest and, with a little luck, you'll even spot animals feasting on a recent kill. Get a better view and take better snapshots aboard this off-road ride. Meal plan: BREAKFAST, LUNCH, DINNER",
                "destination": [
                    {
                        "name": "Maasai Mara",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict1.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -1.3609671486814392,
                            "longitude": 35.188916940255325
                        },
                        "recommendedAirportCode": "NBO",
                        "recommendedAirportName": "Jomo Kenyatta International"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 7: Masai Mara/Nairobi",
                "description": "Witness a breathtaking sunrise over the savanna during your final safari in Masai Mara, and head back to Nairobi. Stop en route at Café Ubuntu, a G Adventures–supported Planeterra project that trains and employs local women and mothers of children with disabilities. Café Ubuntu is an oasis with delicious organic food, hospitable staff, and a relaxing atmosphere based in Maai Mahiu. It is a beacon for tourists who drive through the area each year on their way to the famous Maasai Mara conservancy. Learn about how the initiative empowers the community, visit the craft centre to meet some of the women who create the wares sold there, and then sit down for a delicious farm-to-table lunch. Options range from breakfast tacos, soups, and salads, to freshly made pizzas, curry dishes, and burritos. Rise early for a final morning wildlife safari drive, enjoying the African sun as it rises over the savannah of the Mara plains. Return to Nairobi in the late afternoon and opt to join the CEO in a farewell dinner. Maasai Mara Wildlife Safari Drive: Maasai Mara is one of the world’s top safari destinations, known for its abundance of big cats – cheetahs, leopards and lions – as well as the two million wildebeest, Thomson’s gazelles and zebra that migrate annually across the vast grasslands in search of water. Set off on safari with our driver/guide and keep your eyes and ears peeled for movement and memories. Watch elephants and giraffe grazing, photograph zebras and wildebeest and, with a little luck, you'll even spot animals feasting on a recent kill. Get a better view and take better snapshots aboard this off-road ride with a pop-up top. Meal plan: BREAKFAST, LUNCH",
                "destination": [
                    {
                        "name": "Maasai Mara",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict1.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/masaimara/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -1.3609671486814392,
                            "longitude": 35.188916940255325
                        },
                        "recommendedAirportCode": "NBO",
                        "recommendedAirportName": "Jomo Kenyatta International"
                    }
                ],
                "activities": [],
                "hotels": []
            },
            {
                "title": "Day 8: Nairobi",
                "description": "Depart at any time. Departure Day: Not ready to leave? Your CEO can help with travel arrangements to extend your adventure. Meal plan: BREAKFAST",
                "destination": [
                    {
                        "name": "Nairobi",
                        "fromDay": 0,
                        "toDay": 0,
                        "imageUrls": [
                            "https://tr2storage.blob.core.windows.net/imagenes/GcHqDu3R6a5j-ffz1cpBUXzjpeg.jpeg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict2.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict3.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict4.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict5.jpg",
                            "https://tr2storage.blob.core.windows.net/imagenes/africa/kenia/nairobi/pict6.jpg"
                        ],
                        "geolocation": {
                            "latitude": -1.292066,
                            "longitude": 36.821946
                        },
                        "recommendedAirportCode": "NBO",
                        "recommendedAirportName": "Jomo Kenyatta International",
                        "moreInfoUrl": "https://en.wikipedia.org/wiki/Kisumu"
                    }
                ],
                "activities": [],
                "hotels": []
            }
        ],
        "counters": {
            "adults": 2,
            "children": 0,
            "destinations": 4,
            "closedTours": 1,
            "hotelNights": 7,
            "transports": 0,
            "hotels": 4,
            "cars": 0,
            "tickets": 0,
            "transfers": 0,
            "insurances": 0,
            "manuals": 0,
            "cruises": 0
        }
    }
}
```

With this operation we will obtain a list of the closed tour data sheets.

\- **provider**: With this mandatory parameter we can filter by povider. For example ADALTE.

\- **first**: With this parameter we can indicate the index of the first closed tour of the list to be received.

\- **limit**: With this parameter we can specify maximum number of items per page.

\- **active**: With this parameter we can filter whether closed tours are active or not.

```
curl --location 'http://default.localhost/resources/static/closedtour/datasheet' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NTA4NSwianRpIjoiRDZGMzQxQjgtOEM5My00QTYwLUI4ODQtNkI4QzI4QkMxN0Y2In0.8trmq53zZ1T1xvW2UhoUTT1jHDkUNYb39BSJTbjX3MHjR1PRX-QJsGeuBfPb8WrkYlVPsQwhYkl-G2Pv4r5uOg' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data '{
  "provider": "ADALTE",
  "first": 0,
  "limit": 0,
  "active": true
}'
```

```
{
    {
    "pagination": {
        "firstResult": 0,
        "pageResults": 1785,
        "totalResults": 1785
    },
    "auditData": {
        "timestamp": "2025-07-28 07:33:29",
        "processTime": 5521,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NTA4NSwianRpIjoiRDZGMzQxQjgtOEM5My00QTYwLUI4ODQtNkI4QzI4QkMxN0Y2In0.8trmq53zZ1T1xvW2UhoUTT1jHDkUNYb39BSJTbjX3MHjR1PRX-QJsGeuBfPb8WrkYlVPsQwhYkl-G2Pv4r5uOg",
        "traceId": "D6F341B8-8C93-4A60-B884-6B8C28BC17F6",
        "server": "http://localhost:30000"
    },
    "dataSheets": [
        {
            "id": "ADT-10076",
            "name": "Bali Classic from Ubud"
        },
        {
            "id": "ADT-10077",
            "name": "Bali Round Trip"
        },
        {
            "id": "ADT-10078",
            "name": "Java Classico"
        },
        {
            "id": "ADT-10088",
            "name": "Classico Bali da Ubud + Java Classico - Privato"
        },
        {
            "id": "ADT-10144",
            "name": "Classico Bali da Ubud + Java Classico - SIC"
        },
        {
            "id": "ADT-10165",
            "name": "2 Nights in Bangkok with Klong Tour"
        },
        {
            "id": "ADT-10193",
            "name": "Java Classico + Bali Round Trip"
        },
        {
            "id": "ADT-10211",
            "name": "Laos and North Vietnam Explorer - Departure on Friday"
        },
        {
            "id": "ADT-10213",
            "name": "Bangkok, 4 Nights Northern Thailand and Phuket"
        },
        {
            "id": "ADT-10214",
            "name": "Bangkok, 3 Nights Northern Thailand and Phuket"
        },
        {
            "id": "ADT-10215",
            "name": "Bangkok - Northern Thailand: Chiang Rai - Chiang Mai - Phuket"
        },
        {
            "id": "ADT-10221",
            "name": "SIC Salidas Regulares Verano"
        },
        {
            "id": "ADT-10350",
            "name": "Java Classico + Classico Bali da Ubud - SIC"
        },
        {
            "id": "ADT-10485",
            "name": "Phnom Penh via Kampong Thom to Siemreap - Departure on Monday"
        },
        {
            "id": "ADT-11227",
            "name": "Parchi Nazionali della Croazia"
        },
        {
            "id": "ADT-11242",
            "name": "Montenegro \"Bellezza Selvaggia\""
        },
        {
            "id": "ADT-11246",
            "name": "Viaggio nei Balcani"
        },
        {
            "id": "ADT-11352#COL20388",
            "name": "East West Adventure - Hotel at Los Angeles Airport"
        },
        {
            "id": "ADT-11352#COL20389",
            "name": "East West Adventure - Hotel in Downtown Los Angeles"
        },
        {
            "id": "ADT-11352#COL20405",
            "name": "East West Adventure - Hotel at Los Angeles Airport  + Pre package"
        },
        {
            "id": "ADT-11352#COL20407",
            "name": "East West Adventure - Hotel in Downtown Los Angeles + Pre Package"
        },
        {
            "id": "ADT-11473",
            "name": "Teamtour East Complete - Saturday"
        },
        {
            "id": "ADT-11488",
            "name": "Teampak East"
        },
        {
            "id": "ADT-11808",
            "name": "SIC - Bali Discovery 4 Days"
        },
        {
            "id": "ADT-11818",
            "name": "Sic Jogja Free Easy - 3D/2N"
        },
        {
            "id": "ADT-11843",
            "name": "SIC - Java Bali Overland"
        },
        {
            "id": "ADT-11984",
            "name": "Mombasa Rendezvous"
        },
        {
            "id": "ADT-1209",
            "name": "The Aztecs and the Mayan World"
        },
        {
            "id": "ADT-12119",
            "name": "Nature and Culture Yucatan and Campeche"
        },
        {
            "id": "ADT-12141",
            "name": "China Esencial (de Beijing)"
        },
        {
            "id": "ADT-12333",
            "name": "Tesoros de China"
        },
        {
            "id": "ADT-12340",
            "name": "La Bella China"
        },
        {
            "id": "ADT-12341",
            "name": "Gran China desde Beijing a Hong Kong"
        },
        {
            "id": "ADT-12359",
            "name": "Beijing y Shanghai (tren)"
        },
        {
            "id": "ADT-12375",
            "name": "Panda e Crociera sul Fiume Yangtze"
        },
        {
            "id": "ADT-12409",
            "name": "Mini Montenegro"
        },
        {
            "id": "ADT-12436",
            "name": "Colonial Mexico"
        },
        {
            "id": "ADT-12459",
            "name": "Chill out in Montenegro"
        },
        {
            "id": "ADT-12461",
            "name": "Relax and Enjoy in Montenegro"
        },
        {
            "id": "ADT-12462",
            "name": "Fairytale Montenegro"
        },
        {
            "id": "ADT-12464",
            "name": "Adriatic and Rafting Mix"
        },
        {
            "id": "ADT-12465",
            "name": "The best of Montenegro"
        },
        {
            "id": "ADT-12466",
            "name": "Montenegro Active Tour Package"
        },
        {
            "id": "ADT-12467",
            "name": "Explore the Montenegro mountains"
        },
        {
            "id": "ADT-12497",
            "name": "Yucatan and Campeche"
        },
        {
            "id": "ADT-12503",
            "name": "China con Tibet Esencial"
        },
        {
            "id": "ADT-12504",
            "name": "China con Tibet Completo"
        },
        {
            "id": "ADT-12515",
            "name": "Tara Two Day Rafting Tour Package"
        },
        {
            "id": "ADT-12523",
            "name": "Panda y Crucero de Yangtze"
        },
        {
            "id": "ADT-12641",
            "name": "China con Essential Tibet"
        },
        {
            "id": "ADT-12644",
            "name": "Cina e Tibet Completo"
        },
        {
            "id": "ADT-12916",
            "name": "Beijing solo"
        },
        {
            "id": "ADT-12917",
            "name": "Shanghai Solo"
        },
        {
            "id": "ADT-13236",
            "name": "All Around Jordan (Private Tour)"
        },
        {
            "id": "ADT-13347",
            "name": "Albania e lago di Ohrid: l'ultimo segreto d'Europa"
        },
        {
            "id": "ADT-13540",
            "name": "Baltic capitals tour (EN, ES, FR)"
        },
        {
            "id": "ADT-13541",
            "name": "The Best of the Baltic tour (EN)"
        },
        {
            "id": "ADT-13548",
            "name": "Baltic capitals and Lithuanian seacoast tour (EN)"
        },
        {
            "id": "ADT-13562",
            "name": "Lithuania the Amberland tour (EN)"
        },
        {
            "id": "ADT-13770",
            "name": "Atenas y Circuito Clasico de 4 dias con Meteora"
        },
        {
            "id": "ADT-13804",
            "name": "Tour nel Nord della Thailandia, 3 Giorni"
        },
        {
            "id": "ADT-13918",
            "name": "Baltic capitals and Lithuanian seacoast tour (IT, ES, DE, FR)"
        },
        {
            "id": "ADT-13920",
            "name": "The Best of the Baltic tour (IT, ES, FR, DE)"
        },
        {
            "id": "ADT-13922",
            "name": "Lithuania the Amberland tour (IT, FR, DE, ES)"
        },
        {
            "id": "ADT-13926",
            "name": "Le Capitali Baltiche (IT)"
        },
        {
            "id": "ADT-13956#COL20263",
            "name": "The Real New Yorker Package - 4 Nights"
        },
        {
            "id": "ADT-13956#COL20265",
            "name": "The Real New Yorker Package - 6 Nights"
        },
        {
            "id": "ADT-13998",
            "name": "7 Giorni Around Thailand Completo"
        },
        {
            "id": "ADT-14017",
            "name": "Teampak West"
        },
        {
            "id": "ADT-14025",
            "name": "Teamtour West - Sunday"
        },
        {
            "id": "ADT-14029",
            "name": "Teamtour West Complete - Friday"
        },
        {
            "id": "ADT-14031",
            "name": "Teamtour East  - Monday"
        },
        {
            "id": "ADT-14058",
            "name": "7 Días Tailandia al Completo"
        },
        {
            "id": "ADT-14094",
            "name": "Ubud and Menjangan"
        },
        {
            "id": "ADT-14098",
            "name": "6 Days Around Thailand (with Spanish speaking guide)"
        },
        {
            "id": "ADT-14099",
            "name": "5 Días Alrededor de Tailandia"
        },
        {
            "id": "ADT-14104",
            "name": "4 Días Capitales del Siam"
        },
        {
            "id": "ADT-14113",
            "name": "3 Days Angkor Classic (with Italian speaking Guide)"
        },
        {
            "id": "ADT-14176",
            "name": "Golden West Adventure"
        },
        {
            "id": "ADT-14184",
            "name": "West by Southwest in Italiano"
        },
        {
            "id": "ADT-14186",
            "name": "4 Days Cambodia Classic (PNH-REP) (with Italian speaking Guide)"
        },
        {
            "id": "ADT-14187",
            "name": "4 Days Cambodia Classic (REP-PNH) (with Italian speaking Guide)"
        },
        {
            "id": "ADT-14197",
            "name": "3 Days Amazing Luang Prabang Tour"
        },
        {
            "id": "ADT-14205",
            "name": "National Park Explorer - Starting in Las Vegas"
        },
        {
            "id": "ADT-14208",
            "name": "Pacchetto Avventura Californiana"
        },
        {
            "id": "ADT-14209",
            "name": "National Park Explorer - Starting in Los Angeles"
        },
        {
            "id": "ADT-14212",
            "name": "Pacchetto Triangolo dell’Est"
        },
        {
            "id": "ADT-14213",
            "name": "National Park Discovery - Starting in Las Vegas"
        },
        {
            "id": "ADT-14216",
            "name": "National Park Discovery - Starting in Los Angeles"
        },
        {
            "id": "ADT-14217",
            "name": "The Magnificent Eight"
        },
        {
            "id": "ADT-14218",
            "name": "4 Days Cambodia Classic (PNH-REP) (with Spanish speaking Guide)"
        },
        {
            "id": "ADT-14219",
            "name": "Pacchetto dell’Ovest"
        },
        {
            "id": "ADT-14220",
            "name": "4 Days Cambodia Classic (REP-PNH) (with Spanish speaking Guide)"
        },
        {
            "id": "ADT-14221",
            "name": "Pacchetto l’Oro dell’Ovest"
        },
        {
            "id": "ADT-14222",
            "name": "Pacchetto Est-Ovest"
        },
        {
            "id": "ADT-14227#COL20570",
            "name": "North by Northeast - Standard"
        },
        {
            "id": "ADT-14227#COL20573",
            "name": "North by Northeast - Standard + Pre and Post Package"
        },
        {
            "id": "ADT-14235",
            "name": "American Frontier Adventure"
        },
        {
            "id": "ADT-14236",
            "name": "Western Triangle"
        },
        {
            "id": "ADT-14237",
            "name": "9 Días Vietnam Clásico"
        },
        {
            "id": "ADT-14238",
            "name": "Trails of the Southwest"
        },
        {
            "id": "ADT-14257",
            "name": "West by Southwest in Spanish"
        },
        {
            "id": "ADT-14262",
            "name": "Golden West Adventure - Ending in Las Vegas"
        },
        {
            "id": "ADT-14272",
            "name": "Western Wonders"
        },
        {
            "id": "ADT-14275#COL20656",
            "name": "East West Enchantment - Hotel at Los Angeles Airport"
        },
        {
            "id": "ADT-14275#COL20657",
            "name": "East West Enchantment - Hotel in Downtown Los Angeles"
        },
        {
            "id": "ADT-14275#COL20658",
            "name": "East West Enchantment - Hotel at Los Angeles Airport + Pre package"
        },
        {
            "id": "ADT-14275#COL20659",
            "name": "East West Enchantment - Hotel in Downtown Los Angeles + Pre Package"
        },
        {
            "id": "ADT-14310",
            "name": "14 Days Vietnam - Mekong Delta - Cambodia (with Spanish speaking Guide)"
        },
        {
            "id": "ADT-14375",
            "name": "3 Days Angkor Classic (with Spanish speaking Guide)"
        },
        {
            "id": "ADT-14443",
            "name": "Oman Impressions"
        },
        {
            "id": "ADT-14444",
            "name": "Highlights of Oman"
        },
        {
            "id": "ADT-14507",
            "name": "Malta Exclusive"
        },
        {
            "id": "ADT-14519",
            "name": "The Great Migration"
        },
        {
            "id": "ADT-14525",
            "name": "Luxury Short Safari"
        },
        {
            "id": "ADT-14529#COL21218",
            "name": "Safari Nyota Classic - Regular"
        },
        {
            "id": "ADT-14529#PRV21219",
            "name": "Safari Nyota Classic - Private"
        },
        {
            "id": "ADT-14529#PRV21220",
            "name": "Safari Nyota Classic - Private with Lake Eyasi Extension"
        },
        {
            "id": "ADT-14535",
            "name": "Esencia en Boutique"
        },
        {
            "id": "ADT-14556",
            "name": "Guaranteed Departure Armenia"
        },
        {
            "id": "ADT-14564",
            "name": "Giordania e Wadi Rum (Partenza di Martedì)"
        },
        {
            "id": "ADT-14598",
            "name": "Overnight Desert"
        },
        {
            "id": "ADT-14599",
            "name": "Cornovaglia e Inghilterra del Sud"
        },
        {
            "id": "ADT-14613",
            "name": "Reino Hashemita (Martes)"
        },
        {
            "id": "ADT-14614",
            "name": "Reino Hashemita (Sabado y Miercoles)"
        },
        {
            "id": "ADT-14615",
            "name": "Reino Hashemita (Domingo y Jueves)"
        },
        {
            "id": "ADT-14616",
            "name": "Reino Hashemita (Viernes)"
        },
        {
            "id": "ADT-14617",
            "name": "Lawrence das Arabia (Sabado)"
        },
        {
            "id": "ADT-14618",
            "name": "Lawrence das Arabia (Domingo y Jueves)"
        },
        {
            "id": "ADT-14623",
            "name": "Encantos Jordanos (Martes y Sabado)"
        },
        {
            "id": "ADT-14626",
            "name": "Bellezas de Irlanda"
        },
        {
            "id": "ADT-14633",
            "name": "Irlanda Classica"
        },
        {
            "id": "ADT-14633#COL22692",
            "name": "Irlanda Classica - 6 Nights - Departure on Sunday"
        },
        {
            "id": "ADT-14637",
            "name": "Grand Tour Reino Unido y Irlanda"
        },
        {
            "id": "ADT-14647",
            "name": "From North to Bangkok: 2nights, Surin - Korat"
        },
        {
            "id": "ADT-14648",
            "name": "From Northern Thailand to Bangkok"
        },
        {
            "id": "ADT-14649",
            "name": "2 Nights in Khao Sok national park from Surat Thani"
        },
        {
            "id": "ADT-14654",
            "name": "From Bangkok to Chiang Mai through Kanchanaburi"
        },
        {
            "id": "ADT-14659",
            "name": "Irlanda Sud e Nord"
        },
        {
            "id": "ADT-14664#COL21547",
            "name": "Scozia e Orcadi - 8 Notti - Partenza il sabato"
        },
        {
            "id": "ADT-14666",
            "name": "3 Nights - Bangkok - Kanchanaburi - Bangkok"
        },
        {
            "id": "ADT-14667",
            "name": "Bangkok - Damnern Saduak - Kanchanaburi"
        },
        {
            "id": "ADT-14668",
            "name": "Bangkok - Kanchanaburi - Petchburi - Hua Hin"
        },
        {
            "id": "ADT-14669",
            "name": "Scozia on the Road"
        },
        {
            "id": "ADT-14669#COL21564",
            "name": "Scozia on the Road - 7 Notti - Partenza  il sabato"
        },
        {
            "id": "ADT-14671",
            "name": "Castillos y Leyendas de Escocia"
        },
        {
            "id": "ADT-14672",
            "name": "Inglaterra y Escocia"
        },
        {
            "id": "ADT-14674",
            "name": "Mae Hong Son 1 night from Chiang Mai"
        },
        {
            "id": "ADT-14680",
            "name": "Deluxe Adventure in Costa Rica"
        },
        {
            "id": "ADT-14681",
            "name": "Self-Drive Adventure in Costa Rica"
        },
        {
            "id": "ADT-14682",
            "name": "Atenas y Crucero de 1 dia (Hydra, Poros, Aegina)"
        },
        {
            "id": "ADT-14683",
            "name": "Lo Mejor de Escocia e Irlanda"
        },
        {
            "id": "ADT-14691",
            "name": "Athens and 1 day Cruise (Hydra, Poros, Aegina)"
        },
        {
            "id": "ADT-14694",
            "name": "Atenas Mykonos Santorini"
        },
        {
            "id": "ADT-14714",
            "name": "Athens City Break"
        },
        {
            "id": "ADT-14717",
            "name": "Armenia Between Nature and Religion"
        },
        {
            "id": "ADT-14767",
            "name": "Athens, Delphi, Argolis and 1day Cruise (Hydra, Poros, Aegina)"
        },
        {
            "id": "ADT-14804",
            "name": "Women Tour"
        },
        {
            "id": "ADT-14815",
            "name": "Taste and Smell of Armenia"
        },
        {
            "id": "ADT-14825#COL24721",
            "name": "Oasis Riu - 5 nights"
        },
        {
            "id": "ADT-14825#COL24722",
            "name": "Oasis Riu - 4 nights"
        },
        {
            "id": "ADT-14826",
            "name": "The African Dream"
        },
        {
            "id": "ADT-14943",
            "name": "Adventures of Jordan (Arrival in Amman)"
        },
        {
            "id": "ADT-14945",
            "name": "All Around Jordan (Arrival in Amman)"
        },
        {
            "id": "ADT-14959",
            "name": "Best of Jordan (Arrival in Amman)"
        },
        {
            "id": "ADT-15152",
            "name": "2 days Organized Tour Delphi and Meteora"
        },
        {
            "id": "ADT-15161",
            "name": "2 dias Delfos y Meteora excursion regular en espanol"
        },
        {
            "id": "ADT-15179",
            "name": "3 days Organized Classical tour Argolis, Olympia and Delphi"
        },
        {
            "id": "ADT-15180",
            "name": "3 dias Argolis, Olympia y Delfos excursion regular en espanol"
        },
        {
            "id": "ADT-15181",
            "name": "4 dias circuito con Meteora, excursion regular en Espanol"
        },
        {
            "id": "ADT-15182",
            "name": "4 days Classical Organized Tour with Meteora"
        },
        {
            "id": "ADT-15211",
            "name": "Dubai Express"
        },
        {
            "id": "ADT-15218",
            "name": "Dubai Stop Over"
        },
        {
            "id": "ADT-15220",
            "name": "Hello Dubai"
        },
        {
            "id": "ADT-15221",
            "name": "Highlight of United Arab Emirates from Dubai"
        },
        {
            "id": "ADT-15222",
            "name": "Dazzling Dubai"
        },
        {
            "id": "ADT-15223",
            "name": "Signature Dubai"
        },
        {
            "id": "ADT-15290",
            "name": "Escapada a Atenas"
        },
        {
            "id": "ADT-15291",
            "name": "Atenas y Alrededores (Delfos y Argolida)"
        },
        {
            "id": "ADT-15294",
            "name": "Complete Jordan"
        },
        {
            "id": "ADT-15314",
            "name": "8 Days in Jordan (Wednesday and Saturday)"
        },
        {
            "id": "ADT-15315",
            "name": "8 Days in Jordan (Thursday and Sunday)"
        },
        {
            "id": "ADT-15333",
            "name": "Peru Gran Tour Colca"
        },
        {
            "id": "ADT-15337",
            "name": "Jewelry from Kenya and Tanzania"
        },
        {
            "id": "ADT-15353",
            "name": "Wonders of Kenya and Tanzania"
        },
        {
            "id": "ADT-15354",
            "name": "Paradise of Kenya and Tanzania"
        },
        {
            "id": "ADT-15355",
            "name": "Serengeti Safari"
        },
        {
            "id": "ADT-15356",
            "name": "Exclusive Serengeti"
        },
        {
            "id": "ADT-15357",
            "name": "Empakai Crater"
        },
        {
            "id": "ADT-15358",
            "name": "Ngorongoro Crater"
        },
        {
            "id": "ADT-15359",
            "name": "Masai World"
        },
        {
            "id": "ADT-15360",
            "name": "Masai Exclusive"
        },
        {
            "id": "ADT-15364",
            "name": "Essentials of Tanzania"
        },
        {
            "id": "ADT-15366",
            "name": "Baobab Safari in Tanzania"
        },
        {
            "id": "ADT-15367",
            "name": "Savanas and Lakes in Tanzania"
        },
        {
            "id": "ADT-15368",
            "name": "1 Night in Bogota Extension"
        },
        {
            "id": "ADT-15369",
            "name": "Exclusive Tanzania"
        },
        {
            "id": "ADT-15372",
            "name": "Peru Colca"
        },
        {
            "id": "ADT-15374",
            "name": "Ideal Tanzania"
        },
        {
            "id": "ADT-15375",
            "name": "Ecuador Amazzonia e Vulcani"
        },
        {
            "id": "ADT-15392",
            "name": "Ecuador Avenida dei Vulcani"
        },
        {
            "id": "ADT-15394",
            "name": "Perù Veloce"
        },
        {
            "id": "ADT-15456",
            "name": "9 Días Triangulo Thai"
        },
        {
            "id": "ADT-15459",
            "name": "Paquete Bangkok - 2 Noches"
        },
        {
            "id": "ADT-15460",
            "name": "Paquete Bangkok - 3 Noches"
        },
        {
            "id": "ADT-15461",
            "name": "Krabi Package - 3 Nights"
        },
        {
            "id": "ADT-15465",
            "name": "Phi Phi Island Package - 3 Nights"
        },
        {
            "id": "ADT-15466",
            "name": "Phuket Package - 3 Nights"
        },
        {
            "id": "ADT-15468",
            "name": "Koh Samui Package - 3 Nights"
        },
        {
            "id": "ADT-15512",
            "name": "City Break Tel Aviv 1 notte - Gerusalemme 3 notti"
        },
        {
            "id": "ADT-15524",
            "name": "City Break Tel Aviv 2 notti - Gerusalemme 2 notti"
        },
        {
            "id": "ADT-15547",
            "name": "4 Giorni tour Classico con Meteore (Bilingue Italiano-Inglese)"
        },
        {
            "id": "ADT-15584",
            "name": "Great Balkan Round Trip (English-Speaking Guide)"
        },
        {
            "id": "ADT-15585",
            "name": "Croatian National Parks (English-Speaking Guide)"
        },
        {
            "id": "ADT-15586",
            "name": "Montenegro \"Wild Beauty\" (English-Speaking Guide)"
        },
        {
            "id": "ADT-15590",
            "name": "North Tour"
        },
        {
            "id": "ADT-15591",
            "name": "Atenas y Circuito de 4 dias con Meteora y Santorini"
        },
        {
            "id": "ADT-15592",
            "name": "Florida Sunshine"
        },
        {
            "id": "ADT-15610",
            "name": "Vietnam Classico"
        },
        {
            "id": "ADT-15611",
            "name": "Vietnam al Nord e Centro"
        },
        {
            "id": "ADT-15615#COL23256",
            "name": "Times Square Vibes at Park Central - 7 Nights"
        },
        {
            "id": "ADT-15616",
            "name": "Oman Iconico"
        },
        {
            "id": "ADT-15617",
            "name": "Oman Classico"
        },
        {
            "id": "ADT-15647",
            "name": "Tour della Turchia Solo Land"
        },
        {
            "id": "ADT-15665",
            "name": "Tour Kervansaray Solo Land"
        },
        {
            "id": "ADT-15680",
            "name": "Forti, Tigri e Taj"
        },
        {
            "id": "ADT-15681",
            "name": "Royal Rajasthan"
        },
        {
            "id": "ADT-15688",
            "name": "Incredible India"
        },
        {
            "id": "ADT-15708",
            "name": "Mahal e Ghat"
        },
        {
            "id": "ADT-15709",
            "name": "India Per Tutti"
        },
        {
            "id": "ADT-15710#COL23422",
            "name": "The Manhattan Mood - 5 Nights"
        },
        {
            "id": "ADT-15711",
            "name": "1, 2, 3...India"
        },
        {
            "id": "ADT-15717",
            "name": "Rajasthan"
        },
        {
            "id": "ADT-15718",
            "name": "Templos y Tigres"
        },
        {
            "id": "ADT-15719",
            "name": "Overland India del Norte"
        },
        {
            "id": "ADT-15720",
            "name": "Sur de India"
        },
        {
            "id": "ADT-15771",
            "name": "Smart Costa Rica"
        },
        {
            "id": "ADT-15780",
            "name": "5 Days in Jordan"
        },
        {
            "id": "ADT-15781",
            "name": "6 Days in Jordan"
        },
        {
            "id": "ADT-15783",
            "name": "Yogyakarta - Bali Overland"
        },
        {
            "id": "ADT-15788",
            "name": "8 Days in Jordan (Monday and Friday)"
        },
        {
            "id": "ADT-15813",
            "name": "Bike in Nothern Montenegro"
        },
        {
            "id": "ADT-15816",
            "name": "Conquer the Emperor of Mountains"
        },
        {
            "id": "ADT-15817",
            "name": "Unique Montenegro Beauties"
        },
        {
            "id": "ADT-15825",
            "name": "Hiking the Balkan Alps"
        },
        {
            "id": "ADT-15837",
            "name": "Hiking through 'wild beauty' of Montenegro mountains"
        },
        {
            "id": "ADT-15854",
            "name": "Great Eastern Cities - New York to New York"
        },
        {
            "id": "ADT-15855",
            "name": "Western Discovery"
        },
        {
            "id": "ADT-15856",
            "name": "Great Eastern Cities - New York to Philadelphia"
        },
        {
            "id": "ADT-15857",
            "name": "Aloha Discovery - Honolulu"
        },
        {
            "id": "ADT-15858",
            "name": "Aloha Discovery - Maui"
        },
        {
            "id": "ADT-15860",
            "name": "Splendors of the West 12 days"
        },
        {
            "id": "ADT-15861",
            "name": "Western Trails 9 days"
        },
        {
            "id": "ADT-15862",
            "name": "Western Trails 8 days"
        },
        {
            "id": "ADT-15863",
            "name": "Norte y Centro de Vietnam"
        },
        {
            "id": "ADT-15864",
            "name": "Splendors of the West 11 days"
        },
        {
            "id": "ADT-15865",
            "name": "Western Panorama"
        },
        {
            "id": "ADT-15866",
            "name": "California Dreaming"
        },
        {
            "id": "ADT-15883",
            "name": "Vietnam Clásico"
        },
        {
            "id": "ADT-15887",
            "name": "Bolivia Classica"
        },
        {
            "id": "ADT-15900",
            "name": "Route 66 Self Drive - East"
        },
        {
            "id": "ADT-15901",
            "name": "Route 66 Self Drive - West"
        },
        {
            "id": "ADT-15906",
            "name": "New England Explorer Self Drive"
        },
        {
            "id": "ADT-15907",
            "name": "Pioneer Trails Self Drive"
        },
        {
            "id": "ADT-15908",
            "name": "The Great West Self Drive"
        },
        {
            "id": "ADT-15909",
            "name": "Best of the West Self Drive - Los Angeles to Los Angeles"
        },
        {
            "id": "ADT-15911",
            "name": "Best of the West Self Drive - Los Angeles to San Francisco"
        },
        {
            "id": "ADT-15918",
            "name": "North-South Combination Transfer to Saigon - Departure on Wednesday"
        },
        {
            "id": "ADT-15919",
            "name": "Cambodia-Laos Combination - Departure on Monday"
        },
        {
            "id": "ADT-15922",
            "name": "Siem Reap, Battambang and Phnom Penh 8 Days - Departure on Monday"
        },
        {
            "id": "ADT-15923",
            "name": "4 Days in Luang Prabang - Departure on Friday"
        },
        {
            "id": "ADT-15950",
            "name": "Western Values Self Drive - Los Angeles to Los Angeles"
        },
        {
            "id": "ADT-15951",
            "name": "Western Values Self Drive - Los Angeles to San Diego"
        },
        {
            "id": "ADT-15953",
            "name": "Sunshine Trails Self Drive"
        },
        {
            "id": "ADT-15980#COL23907",
            "name": "Jordan Highlights (Arrival in Amman) - 3 Stars Hotels (Departure Saturday or Tuesday)"
        },
        {
            "id": "ADT-15980#COL23908",
            "name": "Jordan Highlights (Arrival in Amman) - 4 Stars Hotels (Departure Saturday or Tuesday)"
        },
        {
            "id": "ADT-15980#COL23909",
            "name": "Jordan Highlights (Arrival in Amman) - 5 Stars Hotels (Departure Saturday or Tuesday)"
        },
        {
            "id": "ADT-15980#COL26145",
            "name": "Jordan Highlights (Arrival in Amman) - 3 Stars Hotels (Departure Friday or Monday)"
        },
        {
            "id": "ADT-15980#COL26146",
            "name": "Jordan Highlights (Arrival in Amman) - 4 Stars Hotels (Departure Friday or Monday)"
        },
        {
            "id": "ADT-15980#COL26147",
            "name": "Jordan Highlights (Arrival in Amman) - 5 Stars Hotels (Departure Friday or Monday)"
        },
        {
            "id": "ADT-15985",
            "name": "American Historic Highways Self Drive"
        },
        {
            "id": "ADT-15986",
            "name": "Eastern Values Self Drive"
        },
        {
            "id": "ADT-15987",
            "name": "Canyon Adventure Self Drive"
        },
        {
            "id": "ADT-15988",
            "name": "Jordan Essentials (Arrival in Amman)"
        },
        {
            "id": "ADT-15989#COL23925",
            "name": "Discover Jordan (Arrival in Amman) - 3 Stars Hotels (Departure Saturday or Tuesday)"
        },
        {
            "id": "ADT-15989#COL23926",
            "name": "Discover Jordan (Arrival in Amman) - 4 Stars Hotels (Departure Saturday or Tuesday)"
        },
        {
            "id": "ADT-15989#COL23927",
            "name": "Discover Jordan (Arrival in Amman) - 5 Stars Hotels (Departure Saturday or Tuesday)"
        },
        {
            "id": "ADT-15989#COL26142",
            "name": "Discover Jordan (Arrival in Amman) - 3 Stars Hotels (Departure Friday or Monday)"
        },
        {
            "id": "ADT-15989#COL26143",
            "name": "Discover Jordan (Arrival in Amman) - 4 Stars Hotels (Departure Friday or Monday)"
        },
        {
            "id": "ADT-15989#COL26144",
            "name": "Discover Jordan (Arrival in Amman) - 5 Stars Hotels (Departure Friday or Monday)"
        },
        {
            "id": "ADT-15995",
            "name": "Adventures of Jordan (Arrival in Aqaba)"
        },
        {
            "id": "ADT-15996",
            "name": "All Around Jordan (Arrival in Aqaba)"
        },
        {
            "id": "ADT-15997",
            "name": "Best of Jordan (Arrival in Aqaba)"
        },
        {
            "id": "ADT-15998",
            "name": "Discover Jordan (Arrival in Aqaba)"
        },
        {
            "id": "ADT-15999",
            "name": "Jordan Highlights (Arrival in Aqaba)"
        },
        {
            "id": "ADT-16005",
            "name": "Istanbulissima con MARE voli da Bergamo"
        },
        {
            "id": "ADT-16021#COL24071",
            "name": "Angkor and Beyond (Partenza di Gruppo) - 3 Nights Tour"
        },
        {
            "id": "ADT-16021#COL24072",
            "name": "Angkor and Beyond (Partenza di Gruppo) - 4 Nights with Tonle Sap Lake"
        },
        {
            "id": "ADT-16037",
            "name": "Vietnam Experience da Nord a Sud"
        },
        {
            "id": "ADT-16038#COL24184",
            "name": "Phnom Penh to Angkor and Beyond Partenza di Gruppo - Luxury Boutique - 5 Nights Tour"
        },
        {
            "id": "ADT-16038#COL24185",
            "name": "Phnom Penh to Angkor and Beyond Partenza di Gruppo - Luxury Boutique - 6 Nights with Tonle Sap Lake"
        },
        {
            "id": "ADT-16039#COL24193",
            "name": "Phnom Penh to Angkor and Beyond (Partenza di Gruppo) - 6 Nights with Tonle Sap Lake"
        },
        {
            "id": "ADT-16040",
            "name": "Laghi, Montagne e Antiche Città"
        },
        {
            "id": "ADT-16042#COL24212",
            "name": "Angkor and Beyond (Partenza di Gruppo - Luxury Boutique) - 3 Nights Tour"
        },
        {
            "id": "ADT-16042#COL24213",
            "name": "Angkor and Beyond (Partenza di Gruppo - Luxury Boutique) - 4 Nights with Tonle Sap Lake"
        },
        {
            "id": "ADT-16076",
            "name": "The Land of Future"
        },
        {
            "id": "ADT-16077",
            "name": "Giordania Economica (Partenza di Sabato e Mercoledì)"
        },
        {
            "id": "ADT-16079",
            "name": "Giordania Economica (Partenza di Domenica e Giovedì)"
        },
        {
            "id": "ADT-16080",
            "name": "Giordania Economica (Partenza di Lunedì e Venerdì)"
        },
        {
            "id": "ADT-16100",
            "name": "Baltic Express tour (EN, ES, IT)"
        },
        {
            "id": "ADT-16107",
            "name": "Abu Dhabi Stop Over"
        },
        {
            "id": "ADT-16108",
            "name": "Abu Dhabi Express"
        },
        {
            "id": "ADT-16109",
            "name": "Hello Abu Dhabi"
        },
        {
            "id": "ADT-16110",
            "name": "Highlight of United Arab Emirates from Abu Dhabi"
        },
        {
            "id": "ADT-16113",
            "name": "Explore United Arab Emirates"
        },
        {
            "id": "ADT-16114",
            "name": "México Precolombino"
        },
        {
            "id": "ADT-16115",
            "name": "Maravillas de México"
        },
        {
            "id": "ADT-16117",
            "name": "Maravillas de Chiapas y Yucatán"
        },
        {
            "id": "ADT-16119",
            "name": "Maravillas de Guatemala y México"
        },
        {
            "id": "ADT-16120",
            "name": "Civilización Maya"
        },
        {
            "id": "ADT-16121",
            "name": "Imagen y Colores de México"
        },
        {
            "id": "ADT-16123",
            "name": "Encanto Yucateco"
        },
        {
            "id": "ADT-16124",
            "name": "México Mágico"
        },
        {
            "id": "ADT-16125",
            "name": "La Ruta de la Independencia"
        },
        {
            "id": "ADT-16126",
            "name": "Messico Coloniale"
        },
        {
            "id": "ADT-16127",
            "name": "México Virreinal"
        },
        {
            "id": "ADT-16129",
            "name": "México Virreinal finalizando en Guadalajara"
        },
        {
            "id": "ADT-16136",
            "name": "Messico Magico"
        },
        {
            "id": "ADT-16141",
            "name": "La Rotta dell’Indipendenza"
        },
        {
            "id": "ADT-16142",
            "name": "Messico Coloniale con termine in Guadalajara"
        },
        {
            "id": "ADT-16143",
            "name": "Incanto dello Yucatan"
        },
        {
            "id": "ADT-16144",
            "name": "Immagini e Colori del Messico"
        },
        {
            "id": "ADT-16146",
            "name": "Western Frontiers"
        },
        {
            "id": "ADT-16147",
            "name": "Meraviglie del Guatemala e Messico"
        },
        {
            "id": "ADT-16148",
            "name": "Meraviglie del Chiapas e dello Yucatan"
        },
        {
            "id": "ADT-16149",
            "name": "Western Highlights 11 Days"
        },
        {
            "id": "ADT-16151",
            "name": "Messico Precolombiano"
        },
        {
            "id": "ADT-16152",
            "name": "Cultura Maya"
        },
        {
            "id": "ADT-16153",
            "name": "Meraviglie del Messico"
        },
        {
            "id": "ADT-16154",
            "name": "West Coast Aloha (Honolulu Extension) 16 Days"
        },
        {
            "id": "ADT-16155",
            "name": "West Coast Aloha (Maui Extension) 16 Days"
        },
        {
            "id": "ADT-16159",
            "name": "Messico ed il Mondo Maya"
        },
        {
            "id": "ADT-16160",
            "name": "Cancun e il Mondo Maya"
        },
        {
            "id": "ADT-16161",
            "name": "México y el Mundo Maya"
        },
        {
            "id": "ADT-16162",
            "name": "Mundo Maya desde Cancún"
        },
        {
            "id": "ADT-16163",
            "name": "Pacific Coast Insider"
        },
        {
            "id": "ADT-16165",
            "name": "Rocky Mountain Frontiers"
        },
        {
            "id": "ADT-16166",
            "name": "Rockies and Rails"
        },
        {
            "id": "ADT-16169",
            "name": "Le Meraviglie del San Lorenzo"
        },
        {
            "id": "ADT-16179",
            "name": "New York Extension Extravaganza"
        },
        {
            "id": "ADT-16186",
            "name": "Islanda"
        },
        {
            "id": "ADT-16187",
            "name": "Le città della Danimarca"
        }
        {
            "id": "ADT-16190",
            "name": "Gran Tour Inghilterra e Galles"
        },
        {
            "id": "ADT-16208",
            "name": "Jordan Wonders - 6 Notti"
        },
        {
            "id": "ADT-16209",
            "name": "Jordan Wonders - 7 Notti"
        },
        {
            "id": "ADT-16210",
            "name": "SIC - Bali Experience"
        },
        {
            "id": "ADT-16223",
            "name": "Selvaggio West"
        },
        {
            "id": "ADT-16224",
            "name": "Transcanadiana con volo"
        },
        {
            "id": "ADT-16236",
            "name": "Transcanadiana"
        },
        {
            "id": "ADT-16237",
            "name": "Tesori del Canada Orientale"
        },
        {
            "id": "ADT-16238",
            "name": "Ruta the Discovery - 8 Días"
        },
        {
            "id": "ADT-16239",
            "name": "Ruta the Discovery - 9 Días"
        },
        {
            "id": "ADT-16240",
            "name": "Ruta Rocky Mountain Express"
        },
        {
            "id": "ADT-16241",
            "name": "Ruta Rocky Circle Mountain"
        },
        {
            "id": "ADT-16242",
            "name": "Ruta de Mar a Mar"
        },
        {
            "id": "ADT-16243",
            "name": "Atenas y Circuito de 4 dias con Meteora y Crucero de 1 dia"
        },
        {
            "id": "ADT-16244",
            "name": "Lo Major de Jordania (Sabado)"
        },
        {
            "id": "ADT-16245",
            "name": "Lo Major de Jordania (Domingo)"
        },
        {
            "id": "ADT-16249",
            "name": "Reino Hashemita (Domingo y Jueves)"
        },
        {
            "id": "ADT-16250",
            "name": "Atenas y Circuito de 2 dias Delfos - Meteora"
        },
        {
            "id": "ADT-16251",
            "name": "Atenas y circuito de 3 dias Peloponeso y Delfos"
        },
        {
            "id": "ADT-16252",
            "name": "Tesoros de Jordania (Domingo)"
        },
        {
            "id": "ADT-16255",
            "name": "Magie En Jordania (Domingo)"
        },
        {
            "id": "ADT-16260",
            "name": "Highlights of Greece (English-Speaking Guide)"
        },
        {
            "id": "ADT-16265",
            "name": "Albania - Macedonia del Nord - Grecia"
        },
        {
            "id": "ADT-16267",
            "name": "North Macedonia - Albania - Montenegro"
        },
        {
            "id": "ADT-16269",
            "name": "Per Mano a New York"
        },
        {
            "id": "ADT-16273#COL24689",
            "name": "The New Yorker Package - Park Central Hotel - 4 Nights"
        },
        {
            "id": "ADT-16273#COL24690",
            "name": "The New Yorker Package - Park Central Hotel - 5 Nights"
        },
        {
            "id": "ADT-16273#COL24691",
            "name": "The New Yorker Package - Park Central Hotel - 6 Nights"
        },
        {
            "id": "ADT-16273#COL24692",
            "name": "The New Yorker Package - Park Central Hotel - 7 Nights"
        },
        {
            "id": "ADT-16273#COL24693",
            "name": "The New Yorker Package - Park Central Hotel - 8 Nights"
        },
        {
            "id": "ADT-16273#COL24694",
            "name": "The New Yorker Package - Park Central Hotel - 9 Nights"
        },
        {
            "id": "ADT-16273#COL24695",
            "name": "The New Yorker Package - Park Central Hotel - 10 Nights"
        },
        {
            "id": "ADT-16273#COL28258",
            "name": "The New Yorker Package - Park Central Hotel - 3 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28259",
            "name": "The New Yorker Package - Park Central Hotel - 4 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28260",
            "name": "The New Yorker Package - Park Central Hotel - 5 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28261",
            "name": "The New Yorker Package - Park Central Hotel - 6 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28262",
            "name": "The New Yorker Package - Park Central Hotel - 7 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28263",
            "name": "The New Yorker Package - Park Central Hotel - 8 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28264",
            "name": "The New Yorker Package - Park Central Hotel - 9 Nights - Winter 2025"
        },
        {
            "id": "ADT-16273#COL28265",
            "name": "The New Yorker Package - Park Central Hotel - 10 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL24708",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 4 Nights"
        },
        {
            "id": "ADT-16276#COL24709",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 5 Nights"
        },
        {
            "id": "ADT-16276#COL24710",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 6 Nights"
        },
        {
            "id": "ADT-16276#COL24711",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 7 Nights"
        },
        {
            "id": "ADT-16276#COL24712",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 8 Nights"
        },
        {
            "id": "ADT-16276#COL24713",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 9 Nights"
        },
        {
            "id": "ADT-16276#COL24714",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 10 Nights"
        },
        {
            "id": "ADT-16276#COL28129",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 3 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28275",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 4 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28276",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 5 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28277",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 6 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28278",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 7 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28279",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 8 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28280",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 9 Nights - Winter 2025"
        },
        {
            "id": "ADT-16276#COL28281",
            "name": "The New Yorker Package - Romer Hell's Kitchen - 10 Nights - Winter 2025"
        },
        {
            "id": "ADT-16277",
            "name": "Bali Discovery"
        },
        {
            "id": "ADT-16279",
            "name": "Java Bali Overland (Include Ijen Trekking)"
        },
        {
            "id": "ADT-16280",
            "name": "Horizon New York"
        },
        {
            "id": "ADT-16280#COL24726",
            "name": "Horizon New York - 5 nights"
        },
        {
            "id": "ADT-16290",
            "name": "Peru Nazca"
        },
        {
            "id": "ADT-16292",
            "name": "Java Bali Overland"
        },
        {
            "id": "ADT-16303",
            "name": "Gran Cina con Zhangjiajie"
        },
        {
            "id": "ADT-16307",
            "name": "12 Noches Beijing - Xi’an - Guilin - Hangzhou - Suzhou-Shanghai"
        },
        {
            "id": "ADT-16314",
            "name": "Bali Escape"
        },
        {
            "id": "ADT-16315",
            "name": "Living Peru"
        },
        {
            "id": "ADT-16322",
            "name": "New Bali Experience"
        },
        {
            "id": "ADT-16324",
            "name": "Best of Peru"
        },
        {
            "id": "ADT-16325",
            "name": "Legado Maya"
        },
        {
            "id": "ADT-16331",
            "name": "Bolivia Lagune"
        },
        {
            "id": "ADT-16332",
            "name": "Guatemala Classico - 8 Giorni"
        },
        {
            "id": "ADT-16333",
            "name": "Altiplano Copan E Rìo Dulce"
        },
        {
            "id": "ADT-16347",
            "name": "Bolivia Gran Tour"
        },
        {
            "id": "ADT-16353",
            "name": "Peru Bolivia Express con Uyuni"
        },
        {
            "id": "ADT-16355",
            "name": "Peru Bolivia Classico"
        },
        {
            "id": "ADT-16361",
            "name": "India Esencial"
        },
        {
            "id": "ADT-16362",
            "name": "Safari Abu"
        },
        {
            "id": "ADT-16376",
            "name": "Safari Jabu"
        },
        {
            "id": "ADT-16377",
            "name": "Safari Ajabu"
        },
        {
            "id": "ADT-16379#COL24937",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 4 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL24938",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 5 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL24939",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 6 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL24940",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 7 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL24941",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 8 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL24942",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 9 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL24943",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 10 Nights - Winter 2025"
        },
        {
            "id": "ADT-16379#COL28203",
            "name": "The New Yorker Package - Kimpton Hotel Theta - 3 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL24944",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 4 Nights"
        },
        {
            "id": "ADT-16380#COL24945",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 5 Nights"
        },
        {
            "id": "ADT-16380#COL24946",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 6 Nights"
        },
        {
            "id": "ADT-16380#COL24947",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 7 Nights"
        },
        {
            "id": "ADT-16380#COL24948",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 8 Nights"
        },
        {
            "id": "ADT-16380#COL24949",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 9 Nights"
        },
        {
            "id": "ADT-16380#COL24950",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 10 Nights"
        },
        {
            "id": "ADT-16380#COL28234",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 3 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28235",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 4 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28236",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 5 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28237",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 6 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28238",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 7 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28239",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 8 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28240",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 9 Nights - Winter 2025"
        },
        {
            "id": "ADT-16380#COL28241",
            "name": "The New Yorker Package - Millennium Broadway Hotel - 10 Nights - Winter 2025"
        },
        {
            "id": "ADT-16381",
            "name": "Safari Majabu"
        },
        {
            "id": "ADT-16382#COL24952",
            "name": "The New Yorker Package - M Social Hotel - 4 Nights"
        },
        {
            "id": "ADT-16382#COL24953",
            "name": "The New Yorker Package - M Social Hotel - 5 Nights"
        },
        {
            "id": "ADT-16382#COL24954",
            "name": "The New Yorker Package - M Social Hotel - 6 Nights"
        },
        {
            "id": "ADT-16382#COL24955",
            "name": "The New Yorker Package - M Social Hotel - 7 Nights"
        },
        {
            "id": "ADT-16382#COL24956",
            "name": "The New Yorker Package - M Social Hotel - 8 Nights"
        },
        {
            "id": "ADT-16382#COL24957",
            "name": "The New Yorker Package - M Social Hotel - 9 Nights"
        },
        {
            "id": "ADT-16382#COL24958",
            "name": "The New Yorker Package - M Social Hotel - 10 Nights"
        },
        {
            "id": "ADT-16382#COL28226",
            "name": "The New Yorker Package - M Social Hotel - 3 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28227",
            "name": "The New Yorker Package - M Social Hotel - 4 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28228",
            "name": "The New Yorker Package - M Social Hotel - 5 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28229",
            "name": "The New Yorker Package - M Social Hotel - 6 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28230",
            "name": "The New Yorker Package - M Social Hotel - 7 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28231",
            "name": "The New Yorker Package - M Social Hotel - 8 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28232",
            "name": "The New Yorker Package - M Social Hotel - 9 Nights - Winter 2025"
        },
        {
            "id": "ADT-16382#COL28233",
            "name": "The New Yorker Package - M Social Hotel - 10 Nights - Winter 2025"
        },
        {
            "id": "ADT-16384#COL24963",
            "name": "The New Yorker Package - Paramount Hotel - 7 Nights"
        },
        {
            "id": "ADT-16385#COL24967",
            "name": "The New Yorker Package - Park Lane Hotel - 4 Nights"
        },
        {
            "id": "ADT-16385#COL24968",
            "name": "The New Yorker Package - Park Lane Hotel - 5 Nights"
        },
        {
            "id": "ADT-16385#COL24969",
            "name": "The New Yorker Package - Park Lane Hotel - 6 Nights"
        },
        {
            "id": "ADT-16385#COL24970",
            "name": "The New Yorker Package - Park Lane Hotel - 7 Nights"
        },
        {
            "id": "ADT-16385#COL24971",
            "name": "The New Yorker Package - Park Lane Hotel - 8 Nights"
        },
        {
            "id": "ADT-16385#COL24972",
            "name": "The New Yorker Package - Park Lane Hotel - 9 Nights"
        },
        {
            "id": "ADT-16385#COL24973",
            "name": "The New Yorker Package - Park Lane Hotel - 10 Nights"
        },
        {
            "id": "ADT-16385#COL28128",
            "name": "The New Yorker Package - Park Lane Hotel - 3 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28268",
            "name": "The New Yorker Package - Park Lane Hotel - 4 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28269",
            "name": "The New Yorker Package - Park Lane Hotel - 5 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28270",
            "name": "The New Yorker Package - Park Lane Hotel - 6 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28271",
            "name": "The New Yorker Package - Park Lane Hotel - 7 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28272",
            "name": "The New Yorker Package - Park Lane Hotel - 8 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28273",
            "name": "The New Yorker Package - Park Lane Hotel - 9 Nights - Winter 2025"
        },
        {
            "id": "ADT-16385#COL28274",
            "name": "The New Yorker Package - Park Lane Hotel - 10 Nights - Winter 2025"
        },
        {
            "id": "ADT-16386",
            "name": "6 Días Tailandia Esencial"
        },
        {
            "id": "ADT-16387",
            "name": "Bangkok: Krung Thep Pacchetto completo 3 Notti"
        },
        {
            "id": "ADT-16397",
            "name": "7 Días Maravillas de Playas de Tailandia"
        },
        {
            "id": "ADT-16399#COL25003",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 4 Nights"
        },
        {
            "id": "ADT-16399#COL25004",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 5 Nights"
        },
        {
            "id": "ADT-16399#COL25005",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 6 Nights"
        },
        {
            "id": "ADT-16399#COL25006",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 7 Nights"
        },
        {
            "id": "ADT-16399#COL25007",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 8 Nights"
        },
        {
            "id": "ADT-16399#COL25008",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 9 Nights"
        },
        {
            "id": "ADT-16399#COL25009",
            "name": "The New Yorker Package - RIU Plaza New York Hotel - 10 Nights"
        },
        {
            "id": "ADT-16403",
            "name": "Safari Kemkem"
        },
        {
            "id": "ADT-16404",
            "name": "1 Night in Nairobi"
        },
        {
            "id": "ADT-16406",
            "name": "Gran Tour del Messico"
        },
        {
            "id": "ADT-16407",
            "name": "1 Night in Arusha"
        },
        {
            "id": "ADT-16408",
            "name": "Messico e Guatemala"
        },
        {
            "id": "ADT-16409",
            "name": "Seguendo il Quetzal"
        },
        {
            "id": "ADT-16415",
            "name": "Paquete en Chiang Mai - 3 Noches"
        },
        {
            "id": "ADT-16416",
            "name": "Paquete Khao Lak – 3 Noches"
        },
        {
            "id": "ADT-16417",
            "name": "Chiapas e Yucatan - 2025"
        },
        {
            "id": "ADT-16424",
            "name": "Paquete Bangkok y Norte – 7 Dias"
        },
        {
            "id": "ADT-16426",
            "name": "México Arqueológico"
        },
        {
            "id": "ADT-16429",
            "name": "Bangkok y Norte"
        },
        {
            "id": "ADT-16430",
            "name": "Bangkok, Rio Kwai y Norte"
        },
        {
            "id": "ADT-16442",
            "name": "Caminos de Mexico"
        },
        {
            "id": "ADT-16443",
            "name": "México Express"
        },
        {
            "id": "ADT-16444",
            "name": "Aventura Maya"
        },
        {
            "id": "ADT-16446",
            "name": "México Lindo"
        },
        {
            "id": "ADT-16456",
            "name": "3 Days Amazing Luang Prabang Tour (with Italian Speaking Guide)"
        },
        {
            "id": "ADT-16457",
            "name": "Guatemala Clásico"
        },
        {
            "id": "ADT-16459",
            "name": "Bangkok y riquezas del Norte"
        },
        {
            "id": "ADT-16460",
            "name": "Bangkok, Rio Kwai y Norte al completo"
        },
        {
            "id": "ADT-16461#COL25093",
            "name": "Bangkok, Naturaleza y cultura al completo - Turista"
        },
        {
            "id": "ADT-16461#COL25094",
            "name": "Bangkok, Naturaleza y cultura al completo - Primera"
        },
        {
            "id": "ADT-16461#COL25095",
            "name": "Bangkok, Naturaleza y cultura al completo - Semi Lujo"
        },
        {
            "id": "ADT-16461#COL25096",
            "name": "Bangkok, Naturaleza y cultura al completo - Gran Lujo"
        },
        {
            "id": "ADT-16462",
            "name": "Bangkok y Triángulo del Oro"
        },
        {
            "id": "ADT-16467",
            "name": "3 Giorni Classic Sapa"
        },
        {
            "id": "ADT-16468",
            "name": "3 Giorni Delta del Mekong Classico - Fine a Ho Chi Minh"
        },
        {
            "id": "ADT-16475",
            "name": "Istanbulissima con Cappadocia voli da Bergamo"
        },
        {
            "id": "ADT-16483",
            "name": "Colori del Messico"
        },
        {
            "id": "ADT-16484",
            "name": "Weekend a Malta"
        },
        {
            "id": "ADT-16489",
            "name": "Tour Kervansaray Solo Land"
        },
        {
            "id": "ADT-16493",
            "name": "8 Days in Jordan - Dead Sea Stay (Private Departure)"
        },
        {
            "id": "ADT-16494",
            "name": "Mini Tour Classico"
        },
        {
            "id": "ADT-16498",
            "name": "3 Giorni Delta del Mekong Classico - Fine a Phnom Penh"
        },
        {
            "id": "ADT-16499",
            "name": "3 Días Clásico Delta del Mekong - Termina en Ho Chi Minh"
        },
        {
            "id": "ADT-16502",
            "name": "3 Días Clásico Delta del Mekong - Termina en Phnom Penh"
        },
        {
            "id": "ADT-16503",
            "name": "Messico Meraviglioso"
        },
        {
            "id": "ADT-16505",
            "name": "Civilità Maya"
        },
        {
            "id": "ADT-16506",
            "name": "Yucatan"
        },
        {
            "id": "ADT-16507",
            "name": "Discover Yucatan"
        },
        {
            "id": "ADT-16508",
            "name": "Ruta Coloniale"
        },
        {
            "id": "ADT-16509",
            "name": "Guatemala Caraibico"
        },
        {
            "id": "ADT-16511",
            "name": "Civiltà Maya senza soggiorno mare"
        },
        {
            "id": "ADT-16512",
            "name": "7 Days in Jordan (Private Departure)"
        },
        {
            "id": "ADT-16513",
            "name": "Capadocia Mágica"
        },
        {
            "id": "ADT-16514",
            "name": "Descubre Turquía"
        },
        {
            "id": "ADT-16515",
            "name": "Esencias de Turquía"
        },
        {
            "id": "ADT-16516",
            "name": "Colores de Turquía"
        },
        {
            "id": "ADT-16517",
            "name": "6 Days in Jordan (Private Departure)"
        },
        {
            "id": "ADT-16518",
            "name": "5 Days in Jordan - Amman Stay (Private Departure)"
        },
        {
            "id": "ADT-16519",
            "name": "Mexico Lindo"
        },
        {
            "id": "ADT-16547",
            "name": "Gran Tour del Messico senza soggiorno mare"
        },
        {
            "id": "ADT-16550",
            "name": "Splendori Messicani senza soggiorno mare"
        },
        {
            "id": "ADT-16551",
            "name": "Caminos de México senza soggiorno mare"
        },
        {
            "id": "ADT-16552",
            "name": "Messico Meraviglioso senza soggiorno mare"
        },
        {
            "id": "ADT-16553",
            "name": "Messico e Guatemala senza soggiorno mare"
        },
        {
            "id": "ADT-16554",
            "name": "Mini Tour Classico senza soggiorno mare"
        },
        {
            "id": "ADT-16555",
            "name": "Colori del Messico senza soggiorno mare"
        },
        {
            "id": "ADT-16557",
            "name": "Mexico Lindo  senza soggiorno mare"
        },
        {
            "id": "ADT-16559",
            "name": "Guatemala Classico"
        },
        {
            "id": "ADT-16560",
            "name": "Splendori Messicani"
        },
        {
            "id": "ADT-16561",
            "name": "Seguendo il Quetzal senza soggiorno mare"
        },
        {
            "id": "ADT-16562",
            "name": "Caminos de México"
        },
        {
            "id": "ADT-16565",
            "name": "American Heritage Self Drive"
        },
        {
            "id": "ADT-16570",
            "name": "Safari Rasharasha"
        },
        {
            "id": "ADT-16571",
            "name": "Safari Riboribo"
        },
        {
            "id": "ADT-16572",
            "name": "Safari Rafiki"
        },
        {
            "id": "ADT-16573",
            "name": "Safari Ripuripu"
        },
        {
            "id": "ADT-16574",
            "name": "Safari Bahashishi"
        },
        {
            "id": "ADT-16575",
            "name": "Safari Bahati"
        },
        {
            "id": "ADT-16576",
            "name": "Safari Tamasha"
        },
        {
            "id": "ADT-16577",
            "name": "Best of New England Self Drive"
        },
        {
            "id": "ADT-16578",
            "name": "Bali Roundtrip 4 Nights"
        },
        {
            "id": "ADT-16579",
            "name": "Guatemala Caribeño"
        },
        {
            "id": "ADT-16592",
            "name": "Gran Tour della Grecia"
        },
        {
            "id": "ADT-16597",
            "name": "Ruta Colonial"
        },
        {
            "id": "ADT-16598",
            "name": "Civilizaciones Mayas"
        },
        {
            "id": "ADT-16602",
            "name": "Siguiendo el Quetzal"
        },
        {
            "id": "ADT-16603",
            "name": "Spa Tour Naisula Classic"
        },
        {
            "id": "ADT-16604",
            "name": "Spa Tour Classic"
        },
        {
            "id": "ADT-16605",
            "name": "Safari Kongoni Classic"
        },
        {
            "id": "ADT-16608",
            "name": "Tour I colori dell'Andalusia - partenza di giovedì"
        },
        {
            "id": "ADT-16609",
            "name": "México y Guatemala"
        },
        {
            "id": "ADT-16610",
            "name": "Turquia Magica"
        },
        {
            "id": "ADT-16611",
            "name": "Descubriendo Yucatan"
        },
        {
            "id": "ADT-16613",
            "name": "Tesoros de Mesopotamia"
        },
        {
            "id": "ADT-16614",
            "name": "Cambodia - Temples and Beaches"
        },
        {
            "id": "ADT-16615",
            "name": "Yucatán"
        },
        {
            "id": "ADT-16616",
            "name": "Vietnam e Cambogia"
        },
        {
            "id": "ADT-16617",
            "name": "Lo Mejor de Turquía"
        },
        {
            "id": "ADT-16618",
            "name": "Huellas del Balam"
        },
        {
            "id": "ADT-16619",
            "name": "Turquia Vacacional"
        },
        {
            "id": "ADT-16620",
            "name": "Turquía al Completo"
        },
        {
            "id": "ADT-16621",
            "name": "Vietnam Classico con Pu Luong"
        },
        {
            "id": "ADT-16622",
            "name": "Vietnam Highlight"
        },
        {
            "id": "ADT-16623",
            "name": "The Best of Vietnam"
        },
        {
            "id": "ADT-16624",
            "name": "Vietnam at a Glance"
        },
        {
            "id": "ADT-16625",
            "name": "Vietnam and Cambodia Combo"
        },
        {
            "id": "ADT-16626",
            "name": "Vietnam and the Hidden Treasure Pu Luong"
        },
        {
            "id": "ADT-16627",
            "name": "The Best of Indochina"
        },
        {
            "id": "ADT-16638",
            "name": "Vietnam Clásico 8 Noches"
        },
        {
            "id": "ADT-16643",
            "name": "Vietnam meraviglie e tesori"
        },
        {
            "id": "ADT-16645",
            "name": "Vietnam y Camboya Clásico"
        },
        {
            "id": "ADT-16650",
            "name": "Enigmas of the South"
        },
        {
            "id": "ADT-16654#COL25564",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 3 Nights"
        },
        {
            "id": "ADT-16654#COL25565",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 5 Nights"
        },
        {
            "id": "ADT-16654#COL25566",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 6 Nights"
        },
        {
            "id": "ADT-16654#COL25567",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 7 Nights"
        },
        {
            "id": "ADT-16654#COL25568",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 4 Nights"
        },
        {
            "id": "ADT-16654#COL28207",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 8 Nights"
        },
        {
            "id": "ADT-16654#COL28208",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 9 Nights"
        },
        {
            "id": "ADT-16654#COL28209",
            "name": "The New Yorker Package - The Manhattan at Times Square Hotel - 10 Nights"
        },
        {
            "id": "ADT-16657",
            "name": "Shades of Peru"
        },
        {
            "id": "ADT-16658",
            "name": "Vietnam Clásico 9 Noches"
        },
        {
            "id": "ADT-16659",
            "name": "Pre-Tour de Sapa"
        },
        {
            "id": "ADT-16660",
            "name": "Norte de Vietnam con Hoa Lu Tam Coc 5 Noches"
        },
        {
            "id": "ADT-16665",
            "name": "Egitto Tour a tutto Nilo. Partenze di lunedì da Roma"
        },
        {
            "id": "ADT-16666",
            "name": "Vietnam, Camboya y Tailandia en Regular"
        },
        {
            "id": "ADT-16667",
            "name": "Estensione Mai Chau"
        },
        {
            "id": "ADT-16668",
            "name": "The Richness of Southern Peru"
        },
        {
            "id": "ADT-16670",
            "name": "Wonderful Peruvian South"
        },
        {
            "id": "ADT-16671",
            "name": "Estensione Luang Prabang"
        },
        {
            "id": "ADT-16672",
            "name": "Norte de Vietnam con Mai Chau 5 Noches"
        },
        {
            "id": "ADT-16673",
            "name": "Norte de Vietnam"
        },
        {
            "id": "ADT-16674",
            "name": "Hanoi a Hoi An"
        },
        {
            "id": "ADT-16677",
            "name": "Marvelous Tour"
        },
        {
            "id": "ADT-16678",
            "name": "Guatemala Express - 5 Giorni"
        },
        {
            "id": "ADT-16680",
            "name": "Siem Reap 2 Noches"
        },
        {
            "id": "ADT-16681",
            "name": "Siem Reap 3 Noches"
        },
        {
            "id": "ADT-16685",
            "name": "Essential south"
        }
        {
            "id": "ADT-16688",
            "name": "Cruce del Mekong 12 Noches"
        },
        {
            "id": "ADT-16689",
            "name": "Laos 2 Noches"
        },
        {
            "id": "ADT-16690",
            "name": "Weekend at Istanbul"
        },
        {
            "id": "ADT-16691",
            "name": "Laos 3 Noches"
        },
        {
            "id": "ADT-16692",
            "name": "Estensione Phu Quoc"
        },
        {
            "id": "ADT-16693",
            "name": "Istanbul and Cappadocia"
        },
        {
            "id": "ADT-16694",
            "name": "Gran Tour Turkiye"
        },
        {
            "id": "ADT-16695",
            "name": "Discover Cappadocia"
        },
        {
            "id": "ADT-16696",
            "name": "Mundo Maya Arqueológico Express – 8 días"
        },
        {
            "id": "ADT-16697",
            "name": "Estensione Siem Reap - 3 giorni"
        },
        {
            "id": "ADT-16698",
            "name": "Estensione Siem Reap - 4 giorni"
        },
        {
            "id": "ADT-16699",
            "name": "Guatemala a su Aire - 8 Días"
        },
        {
            "id": "ADT-16700",
            "name": "Mundo Maya Arqueológico al Completo - 14 días"
        },
        {
            "id": "ADT-16701",
            "name": "Great Mexico"
        },
        {
            "id": "ADT-16705",
            "name": "Bogotà, Paisaje Cafetero y Cartagena"
        },
        {
            "id": "ADT-16707",
            "name": "Guatemala for Couples - 7 Days"
        },
        {
            "id": "ADT-16708",
            "name": "Mini Tour Classic"
        },
        {
            "id": "ADT-16709",
            "name": "Norte y Centro de Vietnam con Sapa"
        },
        {
            "id": "ADT-16711",
            "name": "Discover Yucatan"
        },
        {
            "id": "ADT-16712",
            "name": "Ruta Colonial"
        },
        {
            "id": "ADT-16714",
            "name": "Couleurs du Mexique"
        },
        {
            "id": "ADT-16715",
            "name": "Adventure Expedition North Coast"
        },
        {
            "id": "ADT-16716",
            "name": "Routes Du Mexique"
        },
        {
            "id": "ADT-16717",
            "name": "Bogota, Coffee Region and Cartagena"
        },
        {
            "id": "ADT-16718",
            "name": "Bogota and Coffee Region 5 nights"
        },
        {
            "id": "ADT-16719",
            "name": "Splendeurs Mexicaines"
        },
        {
            "id": "ADT-16721",
            "name": "I Tesori di Mesopotamia con voli da Bergamo"
        },
        {
            "id": "ADT-16723",
            "name": "Mexique Merveilleux"
        },
        {
            "id": "ADT-16724",
            "name": "Bogotà y Zona Cafetera 5 Noches"
        },
        {
            "id": "ADT-16725",
            "name": "Mexique et Guatemala"
        },
        {
            "id": "ADT-16727",
            "name": "Cappadocia Express Solo Land"
        },
        {
            "id": "ADT-16729",
            "name": "Civilisations Mayas"
        },
        {
            "id": "ADT-16731",
            "name": "Mexique Charmant"
        },
        {
            "id": "ADT-16732",
            "name": "Three cities to fall in love with"
        },
        {
            "id": "ADT-16734",
            "name": "Grand Tour of Cuba"
        },
        {
            "id": "ADT-16735",
            "name": "Vietnam Clásico con Nha Trang Playa"
        },
        {
            "id": "ADT-16736",
            "name": "Vietnam Clásico con Phu Quoc Playa"
        },
        {
            "id": "ADT-16737",
            "name": "La Grand Indochina"
        },
        {
            "id": "ADT-16738",
            "name": "Tres Ciudades que enamoran"
        },
        {
            "id": "ADT-16741",
            "name": "Indochina Clásico"
        },
        {
            "id": "ADT-16742",
            "name": "Cuba Tradicional"
        },
        {
            "id": "ADT-16749",
            "name": "Tour Best of Morocco - cat. standard"
        },
        {
            "id": "ADT-16754",
            "name": "Cuba for Connoisseurs"
        },
        {
            "id": "ADT-16757",
            "name": "Sweet Cuba"
        },
        {
            "id": "ADT-16765",
            "name": "Secrets of the East"
        },
        {
            "id": "ADT-16767",
            "name": "A Cuban vintage ride"
        },
        {
            "id": "ADT-16768",
            "name": "A different Island"
        },
        {
            "id": "ADT-16769",
            "name": "Panorama of Uganda Safari and Extension at Lake Mburo National Park"
        },
        {
            "id": "ADT-16770",
            "name": "Panorama of Uganda Safari and Extension at Mgahinga National Park"
        },
        {
            "id": "ADT-16771",
            "name": "Panorama of Uganda Safari and Community Experience in Buhoma"
        },
        {
            "id": "ADT-16772",
            "name": "1 Night in Entebbe Extension"
        },
        {
            "id": "ADT-16773",
            "name": "Thousand Hills Safari and Extension at Akagera National Park"
        },
        {
            "id": "ADT-16774",
            "name": "A lo Cubano"
        },
        {
            "id": "ADT-16777",
            "name": "Cuba Linda with Casa Particulares"
        },
        {
            "id": "ADT-16778",
            "name": "The Soul of Cuba"
        },
        {
            "id": "ADT-16779",
            "name": "Experience Cuba"
        },
        {
            "id": "ADT-16780",
            "name": "Cuba Linda with Boutique"
        },
        {
            "id": "ADT-16781",
            "name": "Bogotà, Café y flores, 9 noches"
        },
        {
            "id": "ADT-16782",
            "name": "Ruta de la Cana"
        },
        {
            "id": "ADT-16786",
            "name": "Bogotà y el Caribe Colombiano"
        },
        {
            "id": "ADT-16787",
            "name": "Cane Route"
        },
        {
            "id": "ADT-16788",
            "name": "Bogota, Coffee and Flowers"
        },
        {
            "id": "ADT-16789",
            "name": "Bogotà and the Colombian Caribbean"
        },
        {
            "id": "ADT-16790",
            "name": "Complete Santa Cruz 5 days"
        },
        {
            "id": "ADT-16791",
            "name": "Complete San Cristobal 5 Days"
        },
        {
            "id": "ADT-16792",
            "name": "Santa Cruz and San Cristobal Combined 5 days"
        },
        {
            "id": "ADT-16793",
            "name": "Quito, Santa Cruz and San Cristobal Combined 8 days (Galapagos)"
        },
        {
            "id": "ADT-16796",
            "name": "La Vida Real"
        },
        {
            "id": "ADT-16797",
            "name": "Barahona on a shoestring"
        },
        {
            "id": "ADT-16800",
            "name": "Dom Rep Cocktail"
        },
        {
            "id": "ADT-16805",
            "name": "Highlights Dominican Republic"
        },
        {
            "id": "ADT-16806",
            "name": "Nature experience in Hidden Paradise"
        },
        {
            "id": "ADT-16807",
            "name": "Tour Uzbekistan classico"
        },
        {
            "id": "ADT-16809",
            "name": "Western and Central Cuba by E-bike"
        },
        {
            "id": "ADT-16813",
            "name": "Portrait of an Island"
        },
        {
            "id": "ADT-16814",
            "name": "La Vida Cubana"
        },
        {
            "id": "ADT-16817",
            "name": "Sun, Beach and Golf"
        },
        {
            "id": "ADT-16821",
            "name": "12 Days Classic Vietnam and Cambodia"
        },
        {
            "id": "ADT-16822",
            "name": "3 Days Classic Bangkok Stopover"
        },
        {
            "id": "ADT-16834",
            "name": "Extraordinary Peru"
        },
        {
            "id": "ADT-16835",
            "name": "The Heart of the Empire"
        },
        {
            "id": "ADT-16836",
            "name": "Inca Journey"
        },
        {
            "id": "ADT-16837",
            "name": "Vietnam Con Spiaggia di Nha Trang"
        },
        {
            "id": "ADT-16839",
            "name": "Andean World"
        },
        {
            "id": "ADT-16840",
            "name": "Ancient and Colonial Cusco"
        },
        {
            "id": "ADT-16841",
            "name": "Andean Trilogy"
        },
        {
            "id": "ADT-16842",
            "name": "Inca treasures"
        },
        {
            "id": "ADT-16844",
            "name": "4 Days RV River Kwai Cruise - Upstream"
        },
        {
            "id": "ADT-16852",
            "name": "Guayaquil, Santa Cruz and San Cristobal Combined 8 days (Galapagos)"
        },
        {
            "id": "ADT-16853",
            "name": "Meraviglie del Pacifico - 8 Giorni"
        },
        {
            "id": "ADT-16855",
            "name": "Canadá Económico 7 Noches"
        },
        {
            "id": "ADT-16856",
            "name": "Costa a Costa 14 Noches"
        },
        {
            "id": "ADT-16857",
            "name": "Esplendores del Oeste 7 Noches"
        },
        {
            "id": "ADT-16858",
            "name": "Maravillas del Pacifico - 9 Días"
        },
        {
            "id": "ADT-16859",
            "name": "Ruta del Este Básico"
        },
        {
            "id": "ADT-16860",
            "name": "Wonders Of the Pacific"
        },
        {
            "id": "ADT-16864",
            "name": "Perù Mistico"
        },
        {
            "id": "ADT-16867",
            "name": "Perù Classico"
        },
        {
            "id": "ADT-16868",
            "name": "Islanda - Aurora Tra i Ghiacci"
        },
        {
            "id": "ADT-16870",
            "name": "Terra Maya - 5 Giorni"
        },
        {
            "id": "ADT-16872",
            "name": "Tierra Maya - 5 Días"
        },
        {
            "id": "ADT-16874",
            "name": "Mercadillos Navideños"
        },
        {
            "id": "ADT-16877",
            "name": "Suiza Autentica"
        },
        {
            "id": "ADT-16878",
            "name": "Aurora Boreal"
        },
        {
            "id": "ADT-16881",
            "name": "De Viena a Frankfurt"
        },
        {
            "id": "ADT-16883",
            "name": "Alemania - Selva Negra y Suiza"
        },
        {
            "id": "ADT-16884",
            "name": "Descubra Suiza"
        },
        {
            "id": "ADT-16885",
            "name": "Baviera y Suiza"
        },
        {
            "id": "ADT-16886",
            "name": "Europa del Este y Alemania"
        },
        {
            "id": "ADT-16887",
            "name": "Alemania y Viena"
        },
        {
            "id": "ADT-16888",
            "name": "Alemania Romántica y Selva Negra"
        },
        {
            "id": "ADT-16889",
            "name": "Tour de los Alpes"
        },
        {
            "id": "ADT-16890",
            "name": "Austria y Zurich"
        },
        {
            "id": "ADT-16891",
            "name": "Países Bajos y París"
        },
        {
            "id": "ADT-16892",
            "name": "De Praga a París"
        },
        {
            "id": "ADT-16894",
            "name": "Capitales Imperiales (Premium)"
        },
        {
            "id": "ADT-16896",
            "name": "Europa del Este (Premium)"
        },
        {
            "id": "ADT-16897",
            "name": "Capitales Imperiales a su Alcance"
        },
        {
            "id": "ADT-16898",
            "name": "Europa del Este a su Alcance"
        },
        {
            "id": "ADT-16899",
            "name": "Capitales Imperiales (Hot Deal)"
        },
        {
            "id": "ADT-16900",
            "name": "Europa del Este (Hot Deal)"
        },
        {
            "id": "ADT-16906",
            "name": "Triángulo de Europa Oriental"
        },
        {
            "id": "ADT-16908",
            "name": "Descubra Croacia, Eslovenia y Bosnia"
        },
        {
            "id": "ADT-16909",
            "name": "Perlas Balcánicas"
        },
        {
            "id": "ADT-16910",
            "name": "Balcanes y Capitales Imperiales"
        },
        {
            "id": "ADT-16911",
            "name": "Alemania Romántica y Balcanes"
        },
        {
            "id": "ADT-16912",
            "name": "Paises Balcanes (Hot deal)"
        },
        {
            "id": "ADT-16913",
            "name": "Tierra Maya - 5 Days"
        },
        {
            "id": "ADT-16914",
            "name": "National Parks Explorer Self Drive"
        },
        {
            "id": "ADT-16922",
            "name": "Imperio Vikingo y Helsinki"
        },
        {
            "id": "ADT-16923",
            "name": "Imperio Vikingo"
        },
        {
            "id": "ADT-16924",
            "name": "Helsinki y Fiordos Magníficos"
        },
        {
            "id": "ADT-16925",
            "name": "Discover United Arab Emirates"
        },
        {
            "id": "ADT-16926",
            "name": "Fiordos Magníficos"
        },
        {
            "id": "ADT-16927",
            "name": "Descubra Os Fjords e Helsinque"
        },
        {
            "id": "ADT-16928",
            "name": "Iconic United Arab Emirates Starting from Abu Dhabi"
        },
        {
            "id": "ADT-16929",
            "name": "Descubra los Fiordos"
        },
        {
            "id": "ADT-16930",
            "name": "Dinamarca Cabo Norte y Laponia"
        },
        {
            "id": "ADT-16932",
            "name": "Imperio Vikingo y Báltico"
        },
        {
            "id": "ADT-16933",
            "name": "Mini Tour - Partenza Speciale Catrinas e Giorno dei Morti 2025"
        },
        {
            "id": "ADT-16934",
            "name": "Barranca del Cobre"
        },
        {
            "id": "ADT-16936",
            "name": "Barranca del Cobre"
        },
        {
            "id": "ADT-16937",
            "name": "Tesoros Coloniales y Los Secretos del Tequila"
        },
        {
            "id": "ADT-16938",
            "name": "Barranca del Cobre"
        },
        {
            "id": "ADT-16939",
            "name": "Colonial treasures and the secrets of the Tequila"
        },
        {
            "id": "ADT-16941",
            "name": "Estocolmo y El Báltico"
        },
        {
            "id": "ADT-16946",
            "name": "España Con Estilo y Experiencias"
        },
        {
            "id": "ADT-16947",
            "name": "Descubra Francia"
        },
        {
            "id": "ADT-16948",
            "name": "Inglaterra - Escocia - Irlanda"
        },
        {
            "id": "ADT-16950",
            "name": "Lo Mejor De Turquía"
        },
        {
            "id": "ADT-16952",
            "name": "Berlín, Países Bajos y París"
        },
        {
            "id": "ADT-16953",
            "name": "De Viena a París"
        },
        {
            "id": "ADT-16954",
            "name": "Países Bajos y Francia"
        },
        {
            "id": "ADT-16955",
            "name": "Capitales Imperiales (Primera)"
        },
        {
            "id": "ADT-16956",
            "name": "Capitales Imperiales con Termas (Primera)"
        },
        {
            "id": "ADT-16957",
            "name": "Europa del Este (Primera)"
        },
        {
            "id": "ADT-16958",
            "name": "Europa del Este con Termas (Primera)"
        },
        {
            "id": "ADT-16959",
            "name": "Descubra El Báltico - 10 Días"
        },
        {
            "id": "ADT-16960",
            "name": "Descubra El Báltico - 8 Días"
        },
        {
            "id": "ADT-16963",
            "name": "American Getaway"
        },
        {
            "id": "ADT-16964",
            "name": "Wild West"
        },
        {
            "id": "ADT-16965",
            "name": "Magnificent West"
        },
        {
            "id": "ADT-16968",
            "name": "7 Days Tour Including Las Vegas and the Desert Parks"
        },
        {
            "id": "ADT-16972",
            "name": "The Magnificent West from San Francisco"
        },
        {
            "id": "ADT-16973",
            "name": "Galápagos in Grande: 9 Days of Adventure in the Most Iconic Islands"
        },
        {
            "id": "ADT-16975",
            "name": "Java Classico + Bali Serenity"
        },
        {
            "id": "ADT-16977",
            "name": "Barcelona, Madrid  and Lisbon - 08 nights"
        },
        {
            "id": "ADT-16979",
            "name": "American Getaway (Reverse, departures on Saturday)"
        },
        {
            "id": "ADT-16980",
            "name": "Maravillosa Gran Bretaña – Inglaterra, Escocia y Gales"
        },
        {
            "id": "ADT-16981",
            "name": "The Majestic Tour – Inglaterra, Escocia, Irlanda y Gales"
        },
        {
            "id": "ADT-16982",
            "name": "Laghi, Montagne e Antiche Città con Centro Elefanti Sostenibile"
        },
        {
            "id": "ADT-16984",
            "name": "Perù Imperiale"
        },
        {
            "id": "ADT-16985",
            "name": "Perù Express"
        },
        {
            "id": "ADT-16986",
            "name": "Perù Misterioso"
        }
        {
            "id": "ADT-16989",
            "name": "Highlights of Spain - 12 nights"
        },
        {
            "id": "ADT-16990",
            "name": "4 Days Siam Capitals Discovery"
        },
        {
            "id": "ADT-16991",
            "name": "Spanish Splendors - 10 Nights"
        },
        {
            "id": "ADT-16992",
            "name": "5 Days Thai Wonders"
        },
        {
            "id": "ADT-16996",
            "name": "Exotico Invierno 7 Noches"
        },
        {
            "id": "ADT-16998",
            "name": "6 Days Around Thailand"
        },
        {
            "id": "ADT-16999",
            "name": "7 Days Thailand’s Cultural Treasures"
        },
        {
            "id": "ADT-17022",
            "name": "Ronda Alpina"
        },
        {
            "id": "ADT-17023",
            "name": "Tour Reino Unido e Irlanda - De Londres a Dublin"
        },
        {
            "id": "ADT-17024",
            "name": "Tour Reino Unido e Irlanda - De Edimburgo a Londres"
        },
        {
            "id": "ADT-17025",
            "name": "Magic Colombia"
        },
        {
            "id": "ADT-17026",
            "name": "Colombia Iconica"
        },
        {
            "id": "ADT-17027",
            "name": "Quito and the Ecuadorian Amazon"
        },
        {
            "id": "ADT-17028",
            "name": "8 Days in Jordan - Aqaba Stay (Private Departure)"
        },
        {
            "id": "ADT-17029",
            "name": "8 Days in Jordan - Aqaba Leisure (Private Departure)"
        },
        {
            "id": "ADT-17030",
            "name": "5 Days in Jordan - Aqaba Stay (Private Departure)"
        },
        {
            "id": "ADT-17031",
            "name": "Nord, Luci della Ribalta 3 Notti"
        },
        {
            "id": "ADT-17033",
            "name": "4 Days Siam Capitals Discovery"
        },
        {
            "id": "ADT-17040",
            "name": "5 Days Thai Wonders"
        },
        {
            "id": "ADT-17041",
            "name": "6 Days Around Thailand"
        },
        {
            "id": "ADT-17042",
            "name": "7 Days Thailand’s Cultural Treasures"
        },
        {
            "id": "ADT-17049",
            "name": "Sands and Turtles"
        },
        {
            "id": "ADT-17050",
            "name": "Jabal Shams and Jabal Akhdar Mountain"
        },
        {
            "id": "ADT-17052",
            "name": "Imperial Cities from Casablanca end Casablanca"
        },
        {
            "id": "ADT-17053",
            "name": "Imperial Cities from Marrakech end Marrakech"
        },
        {
            "id": "ADT-17055",
            "name": "Barcelona City break - 03 nights"
        },
        {
            "id": "ADT-17057",
            "name": "Barcelona City break - 04 nights"
        },
        {
            "id": "ADT-17059",
            "name": "Barcelona City break - 05 nights"
        },
        {
            "id": "ADT-17063",
            "name": "Escape to the Desert"
        },
        {
            "id": "ADT-17064",
            "name": "Discovery of Morocco from Marrakech end Marrakech"
        },
        {
            "id": "ADT-17068",
            "name": "Imperial Cities from Casablanca end Marrakech"
        },
        {
            "id": "ADT-17085",
            "name": "Magical South"
        },
        {
            "id": "ADT-17095",
            "name": "Classical Morocco"
        },
        {
            "id": "ADT-17099",
            "name": "Istanbulissima con voli da Bologna"
        },
        {
            "id": "ADT-17101",
            "name": "Treasures of Morocco"
        },
        {
            "id": "ADT-17105",
            "name": "Istanbulissima Solo Land"
        },
        {
            "id": "ADT-17110",
            "name": "Tour Della Turchia Solo Land"
        },
        {
            "id": "ADT-17111",
            "name": "Essenziali della Turchia con voli da Bologna"
        },
        {
            "id": "ADT-17115",
            "name": "Costa a Costa 13 Noches"
        },
        {
            "id": "ADT-17117",
            "name": "Costa a Costa desde Montreal  12 Noches"
        },
        {
            "id": "ADT-17118",
            "name": "Costa a Costa desde Montreal 13 Noches"
        },
        {
            "id": "ADT-17120",
            "name": "Costa a Costa desde Montreal 14 Noches"
        },
        {
            "id": "ADT-17121",
            "name": "Esencias del Este 6 Noches"
        },
        {
            "id": "ADT-17122",
            "name": "Esplendores del Oeste 6 Noches"
        },
        {
            "id": "ADT-17123",
            "name": "Este Canadiense con Ballenas"
        },
        {
            "id": "ADT-17125",
            "name": "Messico Meraviglioso"
        },
        {
            "id": "ADT-17127",
            "name": "Este Canadiense sin Fronteras  6 Noches"
        },
        {
            "id": "ADT-17128",
            "name": "Messico Classico"
        },
        {
            "id": "ADT-17129",
            "name": "Chiapas e Yucatan"
        },
        {
            "id": "ADT-17131",
            "name": "Yucatan e Mare"
        },
        {
            "id": "ADT-17132",
            "name": "Extraordinario Este Canadiense  8 Noches"
        },
        {
            "id": "ADT-17139",
            "name": "Mar Rojo Jordania (Domingo y Jueves) - 1 noche en Aqaba"
        },
        {
            "id": "ADT-17140",
            "name": "Ruta del Este con Resort Naturaleza"
        },
        {
            "id": "ADT-17141",
            "name": "Ruta del Este Plus"
        },
        {
            "id": "ADT-17142",
            "name": "Mar Morto Jordania (Domingo y Jueves)"
        },
        {
            "id": "ADT-17143",
            "name": "Jordania Completo (Domingo y Jueves)"
        },
        {
            "id": "ADT-17167",
            "name": "Albania - Montenegro (English-Speaking Guide)"
        },
        {
            "id": "ADT-17168",
            "name": "London Town Getaway “on a budget!”"
        },
        {
            "id": "ADT-17169",
            "name": "Tour Campania Spring - Summer"
        },
        {
            "id": "ADT-17191#COL26906",
            "name": "The New Yorker Package Easter - Park Central Hotel - 4 Nights"
        },
        {
            "id": "ADT-17191#COL26909",
            "name": "The New Yorker Package Easter - Park Central Hotel - 7 Nights"
        },
        {
            "id": "ADT-17192",
            "name": "Albania - Montenegro"
        },
        {
            "id": "ADT-17195",
            "name": "New York Extension Mega Extravaganza"
        },
        {
            "id": "ADT-17198",
            "name": "Teamtour Across America"
        },
        {
            "id": "ADT-17201",
            "name": "Bali Roundtrip 6 Days"
        },
        {
            "id": "ADT-17203",
            "name": "SIC - Best of Jogjakarta"
        },
        {
            "id": "ADT-17204",
            "name": "SIC - Gili Trawangan Extension 2 Nights"
        },
        {
            "id": "ADT-17207",
            "name": "Gran Cina con Chengdu (da  Pechino)"
        },
        {
            "id": "ADT-17208",
            "name": "Solo Cairo 3 notti"
        },
        {
            "id": "ADT-17209",
            "name": "Classico Egitto partenza il Sabato"
        },
        {
            "id": "ADT-17210",
            "name": "Classico Egitto partenza la Domenica"
        },
        {
            "id": "ADT-17216",
            "name": "Cultura e tempo libero a Rodi"
        },
        {
            "id": "ADT-17220",
            "name": "Gran Cina con Chengdu (da Shanghai)"
        },
        {
            "id": "ADT-17221",
            "name": "Bali Serenity"
        },
        {
            "id": "ADT-17223",
            "name": "Cappadocia Express con voli da Roma"
        },
        {
            "id": "ADT-17226",
            "name": "Essenziali della Turchia con voli da Roma"
        },
        {
            "id": "ADT-17227",
            "name": "Essenziali della Turchia con voli da Bergamo"
        },
        {
            "id": "ADT-17230",
            "name": "Istanbulissima con voli da Roma"
        },
        {
            "id": "ADT-17231",
            "name": "Kervansaray con voli da Roma"
        },
        {
            "id": "ADT-17232",
            "name": "Kervansaray con voli da Bologna"
        },
        {
            "id": "ADT-17233",
            "name": "Tour Della Turchia con voli da Bologna"
        },
        {
            "id": "ADT-17234",
            "name": "Tour Della Turchia con voli da Bergamo"
        },
        {
            "id": "ADT-17238",
            "name": "Cappadocia Express Solo Land"
        },
        {
            "id": "ADT-17240",
            "name": "Essenziali della Turchia Solo Land"
        },
        {
            "id": "ADT-17240#COL27112",
            "name": "Essenziali della Turchia Solo Land - Categoria D Inverno"
        },
        {
            "id": "ADT-17240#COL27693",
            "name": "Essenziali della Turchia Solo Land - Categoria D Estate"
        },
        {
            "id": "ADT-17240#COL27694",
            "name": "Essenziali della Turchia Solo Land - Categoria E Estate"
        },
        {
            "id": "ADT-17242",
            "name": "Il Meglio della Turchia Solo Land"
        },
        {
            "id": "ADT-17244",
            "name": "Kervansaray con voli da Bergamo"
        },
        {
            "id": "ADT-17245",
            "name": "Kervansaray Solo Land"
        },
        {
            "id": "ADT-17246",
            "name": "Tour Della Turchia con voli da Roma"
        },
        {
            "id": "ADT-17247",
            "name": "Tour Della Turchia con voli da Venezia"
        },
        {
            "id": "ADT-17252",
            "name": "Ibiza Getaway - 5 Nights"
        },
        {
            "id": "ADT-17253",
            "name": "Gran Cina con Chengdu e Zhangjiajie"
        },
        {
            "id": "ADT-17257",
            "name": "Cina Essenziale Boutique"
        },
        {
            "id": "ADT-17258",
            "name": "Essential China (da Shanghai)"
        },
        {
            "id": "ADT-17259",
            "name": "Ibiza Getaway - 7 Nights"
        },
        {
            "id": "ADT-17260",
            "name": "Crociera 07 notti da Marsa Alam"
        },
        {
            "id": "ADT-17262",
            "name": "Safari Saada"
        },
        {
            "id": "ADT-17265",
            "name": "Safari Salala"
        },
        {
            "id": "ADT-17280",
            "name": "Srilanka essenziale in privato"
        },
        {
            "id": "ADT-17282",
            "name": "Grand China Con Zhangjiajie Avartar Mountain"
        },
        {
            "id": "ADT-17284",
            "name": "Safari Kipekee Classic"
        },
        {
            "id": "ADT-17286",
            "name": "Safari Pamoja"
        },
        {
            "id": "ADT-17290",
            "name": "Extension a Nakuru/Maasai Mara"
        },
        {
            "id": "ADT-17291",
            "name": "Tour privato in Srilanka di 8g/7n incluso Yala Park"
        },
        {
            "id": "ADT-17292",
            "name": "Tour privato in  Srilanka di 6 giorni"
        },
        {
            "id": "ADT-17293",
            "name": "Tour privato in Srilanka di 7 g 6 n in Italiano. Cod 03"
        },
        {
            "id": "ADT-17294",
            "name": "Tour privato Srilanka 7 notti"
        },
        {
            "id": "ADT-17295",
            "name": "Srilanka tour privati 9 notti"
        },
        {
            "id": "ADT-17296",
            "name": "Ceylon Splendors Trail - Italian"
        },
        {
            "id": "ADT-17297",
            "name": "Tour di Gruppo a partenze garantite estate"
        },
        {
            "id": "ADT-17298",
            "name": "Tour di gruppo partenze garantite SIC inverno"
        },
        {
            "id": "ADT-17300",
            "name": "Ceylon Cultural Trail (08 Days)"
        },
        {
            "id": "ADT-17301",
            "name": "Ceylon Cultural Trail - (06 Days)"
        },
        {
            "id": "ADT-17302",
            "name": "Ceylon Cultural Trail - (07 Days)"
        },
        {
            "id": "ADT-17303",
            "name": "Ceylon Discovery Trail"
        },
        {
            "id": "ADT-17304",
            "name": "Ceylon Essential Trail"
        },
        {
            "id": "ADT-17305",
            "name": "Ceylon Splendors Trail"
        },
        {
            "id": "ADT-17306",
            "name": "SIC Salidas Regulares Verano"
        },
        {
            "id": "ADT-17307",
            "name": "SIC Salidas Regulares Invierno"
        },
        {
            "id": "ADT-17310",
            "name": "Cairo Package 03 Nights"
        },
        {
            "id": "ADT-17316",
            "name": "Bali - Yogyakarta Overland"
        },
        {
            "id": "ADT-17317",
            "name": "Especial Vietnam Esencial"
        },
        {
            "id": "ADT-17318",
            "name": "Vietnam Norte y Centro"
        },
        {
            "id": "ADT-17332",
            "name": "Extension a Zhangjiajie (Tour con guía de habla inglesa)"
        },
        {
            "id": "ADT-17333",
            "name": "Camboya Esencial"
        },
        {
            "id": "ADT-17334",
            "name": "Templos de Angkor"
        },
        {
            "id": "ADT-17335",
            "name": "Norte, Centro de Vietnam y Angkor"
        },
        {
            "id": "ADT-17336",
            "name": "Vietnam y Camboya Esencial via Delta del Mekong"
        },
        {
            "id": "ADT-17340",
            "name": "Café, Cultura e Historia"
        },
        {
            "id": "ADT-17352",
            "name": "Crociera 04 notti da Marsa Alam"
        },
        {
            "id": "ADT-17359",
            "name": "Extension a Hong Kong"
        },
        {
            "id": "ADT-17361",
            "name": "Atenas Mykonos Santorin Heraklion"
        },
        {
            "id": "ADT-17375",
            "name": "Colombia Classica"
        },
        {
            "id": "ADT-17383",
            "name": "Argentina e Cile Gran Tour con Valdes"
        },
        {
            "id": "ADT-17384",
            "name": "Il Meglio dell'Argentina - Classica"
        },
        {
            "id": "ADT-17385",
            "name": "Il Meglio dell'Argentina - Gran Tour"
        },
        {
            "id": "ADT-17388",
            "name": "Saudi Arabia: Al ula unexplored land"
        },
        {
            "id": "ADT-17393#COL27514",
            "name": "Argentina e Cile Classico - Standard"
        },
        {
            "id": "ADT-17394",
            "name": "Morocco: Berber Villages"
        },
        {
            "id": "ADT-17398",
            "name": "Descubrimiento del Perú, 10 noches"
        },
        {
            "id": "ADT-17401",
            "name": "Perú Místico"
        },
        {
            "id": "ADT-17402",
            "name": "Morocco: La cavalcata del deserto"
        },
        {
            "id": "ADT-17403",
            "name": "Morocco: La sabbia dorata di Agadir"
        },
        {
            "id": "ADT-17408",
            "name": "Perú Esencial"
        },
        {
            "id": "ADT-17409",
            "name": "Perú Esencial + Extension Puno"
        },
        {
            "id": "ADT-17410",
            "name": "Nord Explorer Solidale"
        },
        {
            "id": "ADT-17416",
            "name": "Explorer North Loop - Chiang Mai Hub"
        },
        {
            "id": "ADT-17417",
            "name": "Explorer North Loop - Chiang Rai Hub"
        },
        {
            "id": "ADT-17418",
            "name": "Vietnam Experience da Sud al Centro"
        },
        {
            "id": "ADT-17419",
            "name": "From Hanoi to Angkor by Land"
        },
        {
            "id": "ADT-17420",
            "name": "Morocco: Le città imperiali"
        },
        {
            "id": "ADT-17424",
            "name": "Il Cammino di Santiago"
        },
        {
            "id": "ADT-17425",
            "name": "I tesori medievali della Spagna: Castiglia Estremadura"
        },
        {
            "id": "ADT-17426",
            "name": "Madrid Andalusia e Toledo"
        },
        {
            "id": "ADT-17427",
            "name": "Perú Esencial Místico (Pre Nazca + Perú Esencial)"
        },
        {
            "id": "ADT-17428",
            "name": "Triangolo d’Oro (Partenza da Barcellona)"
        },
        {
            "id": "ADT-17429",
            "name": "Triangolo d’Oro (Partenza da Madrid)"
        },
        {
            "id": "ADT-17430",
            "name": "Triangolo d’Oro (Partenza da Valencia)"
        },
        {
            "id": "ADT-17431",
            "name": "Nord della Spagna (Partenza da Madrid)"
        },
        {
            "id": "ADT-17432",
            "name": "Nord della Spagna (Partenza da Bilbao)"
        },
        {
            "id": "ADT-17433",
            "name": "Gran Tour Andalusia (Partenza da Malaga)"
        },
        {
            "id": "ADT-17434",
            "name": "Gran Tour Andalusia (Partenza da Siviglia)"
        },
        {
            "id": "ADT-17435",
            "name": "I colori dell’Andalusia (Partenza da Malaga)"
        },
        {
            "id": "ADT-17436",
            "name": "I colori dell’Andalusia (Partenza da Siviglia il martedi)"
        },
        {
            "id": "ADT-17437",
            "name": "I colori dell’Andalusia (Partenza da Siviglia il giovedì)"
        },
        {
            "id": "ADT-17438",
            "name": "Tenerife, l’Isola dell’Eterna Primavera"
        },
        {
            "id": "ADT-17439",
            "name": "Portogallo Autentico"
        },
        {
            "id": "ADT-17440",
            "name": "Portogallo e Santiago"
        },
        {
            "id": "ADT-17442",
            "name": "Minitour del Portogallo"
        },
        {
            "id": "ADT-17443",
            "name": "Gran Tour della Grecia"
        },
        {
            "id": "ADT-17444",
            "name": "I Tesori della Francia"
        },
        {
            "id": "ADT-17445",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Budapest)"
        },
        {
            "id": "ADT-17446",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Praga)"
        },
        {
            "id": "ADT-17447",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Vienna)"
        },
        {
            "id": "ADT-17448",
            "name": "Capitali Imperiali dell’Europa Centrale (7 Giorni)"
        },
        {
            "id": "ADT-17449",
            "name": "Minitour Praga e Vienna"
        },
        {
            "id": "ADT-17450",
            "name": "Minitour Vienna e Budapest"
        },
        {
            "id": "ADT-17452",
            "name": "Polonia… La Bella Sconosciuta (Partenza da Varsavia)"
        },
        {
            "id": "ADT-17453",
            "name": "Polonia… La Bella Sconosciuta (Partenza da Cracovia)"
        },
        {
            "id": "ADT-17454",
            "name": "La Polonia Essenziale"
        },
        {
            "id": "ADT-17455",
            "name": "Nord della Germania"
        },
        {
            "id": "ADT-17456",
            "name": "Belgio e Olanda (Partenza da Bruxelles)"
        },
        {
            "id": "ADT-17457",
            "name": "Belgio e Olanda (Partenza da Amsterdam)"
        },
        {
            "id": "ADT-17458",
            "name": "Macedonia (Grecia) - Macedonia del Nord - Bulgaria (Partenza da Sofia)"
        },
        {
            "id": "ADT-17459",
            "name": "Macedonia (Grecia) - Macedonia del Nord - Bulgaria (Partenza da Salonicco)"
        },
        {
            "id": "ADT-17462",
            "name": "Descubrimiento del Perú con pernocte en Aguas Calientes"
        },
        {
            "id": "ADT-17463",
            "name": "Imperio Inca"
        },
        {
            "id": "ADT-17464",
            "name": "Los Colores del Vinicunca"
        },
        {
            "id": "ADT-17465",
            "name": "Perú like a local"
        },
        {
            "id": "ADT-17466",
            "name": "Perú Hiperactivo España"
        },
        {
            "id": "ADT-17467",
            "name": "Cartagena y Santa Marta"
        },
        {
            "id": "ADT-17471",
            "name": "Ruta del Café - Armenia y Medellín"
        },
        {
            "id": "ADT-17472",
            "name": "4 Ciudades 4 Culturas"
        },
        {
            "id": "ADT-17473",
            "name": "Bogotá, Historia y Playa"
        },
        {
            "id": "ADT-17475",
            "name": "Bogotá y Boyaca"
        },
        {
            "id": "ADT-17476",
            "name": "Cartagena y Baru"
        },
        {
            "id": "ADT-17477",
            "name": "Las Tres Perlas del Caribe"
        },
        {
            "id": "ADT-17478",
            "name": "Bogotá y Cartagena"
        },
        {
            "id": "ADT-17479",
            "name": "Bogotá y Medellín"
        },
        {
            "id": "ADT-17480",
            "name": "Medellín y Cartagena"
        },
        {
            "id": "ADT-17481",
            "name": "Colori della Turchia con voli da Bergamo"
        },
        {
            "id": "ADT-17483",
            "name": "Discover Turkey"
        },
        {
            "id": "ADT-17484",
            "name": "Istanbul escape"
        },
        {
            "id": "ADT-17486",
            "name": "Teamtour Eastern Highlights"
        },
        {
            "id": "ADT-17487",
            "name": "Teamtour Complete Eastern Highlights"
        },
        {
            "id": "ADT-17488",
            "name": "Tour in Blu (con volo)"
        },
        {
            "id": "ADT-17497",
            "name": "Lima 03 Días/02 Noches"
        },
        {
            "id": "ADT-17499",
            "name": "Arequipa 04 Días/03 Noches"
        },
        {
            "id": "ADT-17501",
            "name": "United States: Wyoming - Equestrian stay in ranch in Wyoming"
        },
        {
            "id": "ADT-17503",
            "name": "Tour of Apulia"
        },
        {
            "id": "ADT-17504",
            "name": "Argentina: Patagonia - the glaciers of Patagonia"
        },
        {
            "id": "ADT-17505",
            "name": "Cusco 04 Días/03 Noches"
        },
        {
            "id": "ADT-17506",
            "name": "Argentina: Buenos Aires - The Argentine Pampa"
        },
        {
            "id": "ADT-17507",
            "name": "Tour Giordania Favolosa - partenze esclusive min. 8 partecipanti"
        },
        {
            "id": "ADT-17508",
            "name": "Australia: New South wales - The Comboyne plateau"
        },
        {
            "id": "ADT-17509",
            "name": "Albany: On the trail of ancient Zagori"
        },
        {
            "id": "ADT-17512",
            "name": "Kervansaray con MARE voli da Bergamo"
        },
        {
            "id": "ADT-17513",
            "name": "Tour Istanbul e Cappadocia (con volo)"
        },
        {
            "id": "ADT-17514",
            "name": "Armenia: Discovering the cradle of Christianity"
        },
        {
            "id": "ADT-17516",
            "name": "Colori della Turchia con voli da Bologna"
        },
        {
            "id": "ADT-17517",
            "name": "Colori della Turchia con voli da Roma"
        },
        {
            "id": "ADT-17518",
            "name": "Colori della Turchia Solo Land"
        },
        {
            "id": "ADT-17519",
            "name": "I Tesori di Mesopotamia con voli da Bologna"
        },
        {
            "id": "ADT-17520",
            "name": "I Tesori di Mesopotamia con voli da Roma"
        },
        {
            "id": "ADT-17521",
            "name": "I Tesori di Mesopotamia Solo Land"
        },
        {
            "id": "ADT-17522",
            "name": "Istanbulissima con Cappadocia voli da Bologna"
        },
        {
            "id": "ADT-17523",
            "name": "Istanbulissima con Cappadocia Solo Land"
        },
        {
            "id": "ADT-17524",
            "name": "Istanbulissima con Cappadocia voli da Venezia"
        },
        {
            "id": "ADT-17525",
            "name": "Istanbulissima con Cappadocia voli da Roma"
        },
        {
            "id": "ADT-17526",
            "name": "Istanbulissima con MARE voli da Bologna"
        },
        {
            "id": "ADT-17527",
            "name": "Istanbulissima con MARE Solo Land"
        },
        {
            "id": "ADT-17528",
            "name": "Istanbulissima con MARE voli da Venezia"
        },
        {
            "id": "ADT-17529",
            "name": "Istanbulissima con MARE voli da Roma"
        },
        {
            "id": "ADT-17530",
            "name": "Kervansaray con MARE voli da Bologna"
        },
        {
            "id": "ADT-17531",
            "name": "Kervansaray con MARE voli da Roma"
        },
        {
            "id": "ADT-17532",
            "name": "Kervansaray con MARE Solo Land"
        },
        {
            "id": "ADT-17535",
            "name": "France: Provenza - La provenza in viola"
        },
        {
            "id": "ADT-17537",
            "name": "South Africa: Horseback safari in the Waterberg"
        },
        {
            "id": "ADT-17538",
            "name": "Italy: Umbria: Multicolored Umbria"
        },
        {
            "id": "ADT-17539",
            "name": "Italy: Sardinia - the two islands trek"
        },
        {
            "id": "ADT-17540",
            "name": "Special summer: Petra on horseback, red sea and dead sea"
        },
        {
            "id": "ADT-17541",
            "name": "Costarica: Coast 2 coast - From the pacific to the caribbean sea"
        },
        {
            "id": "ADT-17542#COL28130",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 4 Nights"
        },
        {
            "id": "ADT-17542#COL28131",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 5 Nights"
        },
        {
            "id": "ADT-17542#COL28132",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 6 Nights"
        },
        {
            "id": "ADT-17542#COL28133",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 7 Nights"
        },
        {
            "id": "ADT-17542#COL28134",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 8 Nights"
        },
        {
            "id": "ADT-17542#COL28135",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 9 Nights"
        },
        {
            "id": "ADT-17542#COL28136",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 10 Nights"
        },
        {
            "id": "ADT-17542#COL28137",
            "name": "The New Yorker Package - Wyndham New Yorker Hotel - 3 Nights"
        },
        {
            "id": "ADT-17543",
            "name": "Belgio e Olanda (Partenza da Amsterdam)"
        },
        {
            "id": "ADT-17544",
            "name": "Belgio e Olanda (Partenza da Bruxelles)"
        },
        {
            "id": "ADT-17545",
            "name": "Capitali Imperiali dell’Europa Centrale (7 Giorni)"
        },
        {
            "id": "ADT-17546",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Budapest)"
        },
        {
            "id": "ADT-17547",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Praga)"
        },
        {
            "id": "ADT-17548",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Vienna)"
        },
        {
            "id": "ADT-17549",
            "name": "Gran Tour Andalusia (Partenza da Malaga)"
        },
        {
            "id": "ADT-17550#COL28145",
            "name": "The San Francisco Package - RIU Plaza Fisherman's Wharf - 3 Nights"
        },
        {
            "id": "ADT-17550#COL28146",
            "name": "The San Francisco Package - RIU Plaza Fisherman's Wharf - 4 Nights"
        },
        {
            "id": "ADT-17550#COL28147",
            "name": "The San Francisco Package - RIU Plaza Fisherman's Wharf - 5 Nights"
        },
        {
            "id": "ADT-17551",
            "name": "Gran Tour Andalusia (Partenza da Siviglia)"
        },
        {
            "id": "ADT-17552#COL28149",
            "name": "The Los Angeles Package - The Biltmore Los Angeles - 3 Nights"
        },
        {
            "id": "ADT-17552#COL28151",
            "name": "The Los Angeles Package - The Biltmore Los Angeles - 4 Nights"
        },
        {
            "id": "ADT-17552#COL28152",
            "name": "The Los Angeles Package - The Biltmore Los Angeles - 5 Nights"
        },
        {
            "id": "ADT-17553",
            "name": "Gran Tour della Grecia"
        },
        {
            "id": "ADT-17554",
            "name": "I colori dell’Andalusia (Partenza da Malaga)"
        },
        {
            "id": "ADT-17555",
            "name": "I colori dell’Andalusia (Partenza da Siviglia il giovedì)"
        },
        {
            "id": "ADT-17556#COL28155",
            "name": "The Boston Package - The Bostonian Hotel - 3 Nights"
        },
        {
            "id": "ADT-17556#COL28157",
            "name": "The Boston Package - The Bostonian Hotel - 4 Nights"
        },
        {
            "id": "ADT-17556#COL28158",
            "name": "The Boston Package - The Bostonian Hotel - 5 Nights"
        },
        {
            "id": "ADT-17557",
            "name": "I colori dell’Andalusia (Partenza da Siviglia il martedi)"
        },
        {
            "id": "ADT-17558",
            "name": "I Tesori della Francia"
        },
        {
            "id": "ADT-17559",
            "name": "I tesori medievali della Spagna: Castiglia Estremadura"
        },
        {
            "id": "ADT-17560",
            "name": "Il Cammino di Santiago"
        },
        {
            "id": "ADT-17561",
            "name": "La Polonia Essenziale"
        },
        {
            "id": "ADT-17562#COL28163",
            "name": "The Chicago Package - RIU Plaza Chicago Hotel - 3 Nights"
        },
        {
            "id": "ADT-17562#COL28165",
            "name": "The Chicago Package - RIU Plaza Chicago Hotel - 4 Nights"
        },
        {
            "id": "ADT-17562#COL28166",
            "name": "The Chicago Package - RIU Plaza Chicago Hotel - 5 Nights"
        },
        {
            "id": "ADT-17563",
            "name": "Macedonia (Grecia) - Macedonia del Nord - Bulgaria (Partenza da Salonicco)"
        },
        {
            "id": "ADT-17564",
            "name": "Macedonia (Grecia) - Macedonia del Nord - Bulgaria (Partenza da Sofia)"
        },
        {
            "id": "ADT-17565",
            "name": "Madrid Andalusia e Toledo"
        },
        {
            "id": "ADT-17568",
            "name": "Minitour del Portogallo"
        },
        {
            "id": "ADT-17569#COL28173",
            "name": "The New Yorker Package - OYO Times Square Hotel - 4 Nights"
        },
        {
            "id": "ADT-17569#COL28174",
            "name": "The New Yorker Package - OYO Times Square Hotel - 5 Nights"
        },
        {
            "id": "ADT-17569#COL28175",
            "name": "The New Yorker Package - OYO Times Square Hotel - 6 Nights"
        },
        {
            "id": "ADT-17569#COL28176",
            "name": "The New Yorker Package - OYO Times Square Hotel - 7 Nights"
        },
        {
            "id": "ADT-17569#COL28177",
            "name": "The New Yorker Package - OYO Times Square Hotel - 8 Nights"
        },
        {
            "id": "ADT-17569#COL28178",
            "name": "The New Yorker Package - OYO Times Square Hotel - 9 Nights"
        },
        {
            "id": "ADT-17569#COL28179",
            "name": "The New Yorker Package - OYO Times Square Hotel - 10 Nights"
        },
        {
            "id": "ADT-17569#COL28180",
            "name": "The New Yorker Package - OYO Times Square Hotel - 3 Nights"
        },
        {
            "id": "ADT-17570",
            "name": "Minitour Praga e Vienna"
        },
        {
            "id": "ADT-17571",
            "name": "Minitour Vienna e Budapest"
        },
        {
            "id": "ADT-17572",
            "name": "Nord della Germania"
        },
        {
            "id": "ADT-17574",
            "name": "Nord della Spagna (Partenza da Bilbao)"
        },
        {
            "id": "ADT-17575",
            "name": "Nord della Spagna (Partenza da Madrid)"
        },
        {
            "id": "ADT-17576",
            "name": "Polonia… La Bella Sconosciuta (Partenza da Cracovia)"
        },
        {
            "id": "ADT-17577",
            "name": "Polonia… La Bella Sconosciuta (Partenza da Varsavia)"
        },
        {
            "id": "ADT-17578",
            "name": "Portogallo Autentico"
        },
        {
            "id": "ADT-17579",
            "name": "Portogallo e Santiago"
        },
        {
            "id": "ADT-17580",
            "name": "Tenerife, l’Isola dell’Eterna Primavera"
        },
        {
            "id": "ADT-17581",
            "name": "Triangolo d’Oro (Partenza da Barcellona)"
        },
        {
            "id": "ADT-17582",
            "name": "Grece: Crete- Cretan Sceneries"
        },
        {
            "id": "ADT-17583",
            "name": "Triangolo d’Oro (Partenza da Madrid)"
        },
        {
            "id": "ADT-17584",
            "name": "Triangolo d’Oro (Partenza da Valencia)"
        },
        {
            "id": "ADT-17585",
            "name": "Fantasia Estate  (con volo)"
        },
        {
            "id": "ADT-17586",
            "name": "Portugal: Azores - Sao Miguel, the green island"
        },
        {
            "id": "ADT-17587",
            "name": "Belgio e Olanda (Partenza da Amsterdam)"
        },
        {
            "id": "ADT-17588",
            "name": "Belgio e Olanda (Partenza da Bruxelles)"
        },
        {
            "id": "ADT-17590",
            "name": "South Africa: a horse in the eastern cape - discovering the wild coast"
        },
        {
            "id": "ADT-17591",
            "name": "Ireland on Horseback: Castles and Monasteries"
        },
        {
            "id": "ADT-17592",
            "name": "Capitali Imperiali dell’Europa Centrale (7 Giorni)"
        },
        {
            "id": "ADT-17593",
            "name": "Italy: Trekking a cavallo in abruzzo: la terra dei sanniti"
        },
        {
            "id": "ADT-17594",
            "name": "Iceland: in the wake of the northern lights"
        },
        {
            "id": "ADT-17595",
            "name": "Norway: Lofoten islands - the ancient vikings trails"
        },
        {
            "id": "ADT-17596",
            "name": "Splendido Estate  (con volo)"
        },
        {
            "id": "ADT-17597",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Budapest)"
        },
        {
            "id": "ADT-17598",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Praga)"
        },
        {
            "id": "ADT-17599",
            "name": "Capitali Imperiali dell’Europa Centrale (Partenza da Vienna)"
        },
        {
            "id": "ADT-17600",
            "name": "Gran Tour Andalusia (Partenza da Malaga)"
        },
        {
            "id": "ADT-17601",
            "name": "France: Provenza/Camargue - The Gallop of the Mediterranean"
        },
        {
            "id": "ADT-17607",
            "name": "Gran Tour Andalusia (Partenza da Siviglia)"
        },
        {
            "id": "ADT-17608",
            "name": "Gran Tour della Grecia"
        },
        {
            "id": "ADT-17609",
            "name": "Egypt: Discovering the Eastern Desert"
        },
        {
            "id": "ADT-17610",
            "name": "I colori dell’Andalusia (Partenza da Malaga)"
        },
        {
            "id": "ADT-17611",
            "name": "I colori dell’Andalusia (Partenza da Siviglia il giovedì)"
        },
        {
            "id": "ADT-17612",
            "name": "I colori dell’Andalusia (Partenza da Siviglia il martedi)"
        },
        {
            "id": "ADT-17613",
            "name": "I Tesori della Francia"
        },
        {
            "id": "ADT-17614",
            "name": "I tesori medievali della Spagna: Castiglia Estremadura"
        },
        {
            "id": "ADT-17615",
            "name": "Il Cammino di Santiago"
        },
        {
            "id": "ADT-17616",
            "name": "La Polonia Essenziale"
        },
        {
            "id": "ADT-17617",
            "name": "Macedonia (Grecia) - Macedonia del Nord - Bulgaria (Partenza da Salonicco)"
        },
        {
            "id": "ADT-17618",
            "name": "Macedonia (Grecia) - Macedonia del Nord - Bulgaria (Partenza da Sofia)"
        },
        {
            "id": "ADT-17619",
            "name": "Madrid Andalusia e Toledo"
        },
        {
            "id": "ADT-17622",
            "name": "Minitour del Portogallo"
        },
        {
            "id": "ADT-17623",
            "name": "Minitour Praga e Vienna"
        },
        {
            "id": "ADT-17624",
            "name": "Minitour Vienna e Budapest"
        },
        {
            "id": "ADT-17625",
            "name": "Nord della Germania"
        },
        {
            "id": "ADT-17626",
            "name": "Nord della Spagna (Partenza da Bilbao)"
        },
        {
            "id": "ADT-17627",
            "name": "Nord della Spagna (Partenza da Madrid)"
        },
        {
            "id": "ADT-17628",
            "name": "Italy: Molise -  Lake Occhito"
        },
        {
            "id": "ADT-17629",
            "name": "Polonia… La Bella Sconosciuta (Partenza da Cracovia)"
        },
        {
            "id": "ADT-17630",
            "name": "Polonia… La Bella Sconosciuta (Partenza da Varsavia)"
        },
        {
            "id": "ADT-17631",
            "name": "Portogallo Autentico"
        },
        {
            "id": "ADT-17632",
            "name": "Portogallo e Santiago"
        },
        {
            "id": "ADT-17633",
            "name": "Tenerife, l’Isola dell’Eterna Primavera"
        },
        {
            "id": "ADT-17634",
            "name": "Triangolo d’Oro (Partenza da Barcellona)"
        },
        {
            "id": "ADT-17635",
            "name": "Triangolo d’Oro (Partenza da Madrid)"
        },
        {
            "id": "ADT-17636",
            "name": "Triangolo d’Oro (Partenza da Valencia)"
        },
        {
            "id": "ADT-17638",
            "name": "Tour Turchia d'Autore: Istanbul/Cappadocia e mare. Partenze esclusive min. 8 partecipanti"
        },
        {
            "id": "ADT-17639",
            "name": "Oman: The sands of the wahiba desert"
        },
        {
            "id": "ADT-17642",
            "name": "Brasil - Pantanal: the pantanal biosphere reserve"
        },
        {
            "id": "ADT-17643",
            "name": "Morocco: Essaouira, a gem to discover"
        },
        {
            "id": "ADT-17644",
            "name": "Central spain: the monfrague national park"
        },
        {
            "id": "ADT-17656",
            "name": "Iceland: Driving a herd of Icelandic horses"
        },
        {
            "id": "ADT-17658",
            "name": "Uited States: Arizona - working ranch at pleasant valley"
        },
        {
            "id": "ADT-17659",
            "name": "Denmark: Galloping on the wadden sea"
        },
        {
            "id": "ADT-17661",
            "name": "Brasil - Rio/Sao Paulo: Plantation Ride"
        },
        {
            "id": "ADT-17663",
            "name": "Uganda: discovering the White Nile"
        },
        {
            "id": "ADT-17675",
            "name": "Ireland: Monaghan - equestrian stay at castle leslie"
        },
        {
            "id": "ADT-17678",
            "name": "Italy: Horseback Riding Excursions in Abruzzo: The Majella National Park"
        },
        {
            "id": "ADT-17698",
            "name": "Indonesia: The warrior spirit of the people who revere horses."
        },
        {
            "id": "ADT-17699",
            "name": "Chile: Patagonia - the torres del paine national park"
        },
        {
            "id": "ADT-17710",
            "name": "4 Cities 4 Cultures"
        },
        {
            "id": "ADT-17712",
            "name": "Mongolia: Khan Khentii - The Mongolian Trails"
        },
        {
            "id": "ADT-17713",
            "name": "Ireland: Kerry - discovering county kerry"
        },
        {
            "id": "ADT-17735",
            "name": "Magical Tour of Sicily from Catania - Spring Summer"
        },
        {
            "id": "ADT-17737",
            "name": "Botswana: Safari in the Okavango Delta"
        },
        {
            "id": "ADT-17738",
            "name": "Tanzania: Horseback safari in Arusha National Park"
        },
        {
            "id": "ADT-17750",
            "name": "Tesoros de Turquía - De Estambul a Estambul"
        },
        {
            "id": "ADT-17752",
            "name": "Tesoros de Turquía con Upgrade Cuevas Gratis - De Estambul a Estambul"
        },
        {
            "id": "ADT-17753",
            "name": "Tesoros de Turquía - De Estambul a Esmirna"
        },
        {
            "id": "ADT-17754",
            "name": "Tesoros de Turquía con Upgrade Cuevas Gratis - De Estambul a Esmirna"
        },
        {
            "id": "ADT-17755",
            "name": "Chile: Lake District - Crossing the Andes, from Chile to Argentina"
        },
        {
            "id": "ADT-17757",
            "name": "London Town Getaway “with elegance”"
        },
        {
            "id": "ADT-17760",
            "name": "Colombia: Orinoquia natural reserve"
        },
        {
            "id": "ADT-17762",
            "name": "Spain: Andalusia - the donana national park and el Rocio"
        },
        {
            "id": "ADT-17769",
            "name": "Turquía Esencial"
        },
        {
            "id": "ADT-17770",
            "name": "Turquía Esencial con Upgrade Cuevas Gratis"
        },
        {
            "id": "ADT-17771",
            "name": "Turquía Irresistible - De Estambul a Estambul"
        },
        {
            "id": "ADT-17772",
            "name": "Jordan In Your Eyes (Partenza il Sabato e Martedì) - 6 Giorni"
        },
        {
            "id": "ADT-17773",
            "name": "Lisboa, Alentejo y Algarve"
        },
        {
            "id": "ADT-17774",
            "name": "Lisboa, Oporto y Norte de Portugal"
        },
        {
            "id": "ADT-17776",
            "name": "On horseback in dubai: the first among the emirates"
        },
        {
            "id": "ADT-17777",
            "name": "Egypt: What to see in Luxor: the cradle of the pharaohs"
        },
        {
            "id": "ADT-17778",
            "name": "Malta Tour Gold Experience - partenze esclusive min. 8 partecipanti"
        },
        {
            "id": "ADT-17779",
            "name": "Jordania Mágica (Salida el Sábado y Martes) - 8 Días"
        },
        {
            "id": "ADT-17780#COL28578",
            "name": "Jordania Mágica (Salida el Sábado y Martes) - 7 Días - 3 Stars"
        },
        {
            "id": "ADT-17781#COL28581",
            "name": "Jordania Mágica (Salida el Sábado y Martes) - 6 Días - 3 Stars"
        },
        {
            "id": "ADT-17782",
            "name": "Jordania Mágica (Salida el Domingo y Miércoles) - 8 Días"
        },
        {
            "id": "ADT-17783#COL28587",
            "name": "Jordania Mágica (Salida el Domingo y Miércoles) - 7 Días - 3 Stars"
        },
        {
            "id": "ADT-17784#COL28590",
            "name": "Jordania Mágica (Salida el Domingo y Miércoles) - 6 Días - 3 Stars"
        },
        {
            "id": "ADT-17788",
            "name": "Jordan In Your Eyes (Partenza il Sabato e Martedì) - 7 Giorni"
        },
        {
            "id": "ADT-17789",
            "name": "Jordan In Your Eyes (Partenza il Sabato e Martedì) - 8 Giorni"
        },
        {
            "id": "ADT-17790",
            "name": "Jordan Dream (Partenza il Domenica e Mercoledì) - 6 Giorni"
        },
        {
            "id": "ADT-17791",
            "name": "Jordan Dream (Partenza il Domenica e Mercoledì) - 7 Giorni"
        },
        {
            "id": "ADT-17792",
            "name": "Jordan Dream (Partenza il Domenica e Mercoledì) - 8 Giorni"
        },
        {
            "id": "ADT-17794",
            "name": "Jordan Graffiti (Partenza il Lunedì e Giovedì) - 6 Giorni"
        },
        {
            "id": "ADT-17795",
            "name": "Portugal de Norte a Sur"
        },
        {
            "id": "ADT-17796",
            "name": "Jordan Graffiti (Partenza il Lunedì e Giovedì) - 7 Giorni"
        },
        {
            "id": "ADT-17797#COL28628",
            "name": "Jordan Graffiti (Partenza il Lunedì e Giovedì) - 8 Giorni - 3 Stars"
        },
        {
            "id": "ADT-17797#COL28629",
            "name": "Jordan Graffiti (Partenza il Lunedì e Giovedì) - 8 Giorni - 4 Stars"
        },
        {
            "id": "ADT-17798",
            "name": "Jordania Mágica (Salida el Lunes y Jueves) - 8 Días"
        },
        {
            "id": "ADT-17799#COL28634",
            "name": "Jordania Mágica (Salida el Lunes y Jueves) - 7 Días - 3 Stars"
        },
        {
            "id": "ADT-17800",
            "name": "Tour Turchia d'Autore: Istanbul/Cappadocia e mare. Partenza AGOSTO min. 8 partecipanti"
        },
        {
            "id": "ADT-17801#COL28638",
            "name": "Jordania Mágica (Salida el Lunes y Jueves) - 6 Días - 3 Stars"
        },
        {
            "id": "ADT-17805",
            "name": "Las Joyas de Jordania (Salida el Viernes) - 8 Días"
        },
        {
            "id": "ADT-17806#COL28667",
            "name": "Las Joyas de Jordania (Salida el Viernes) - 7 Días - 3 Stars"
        },
        {
            "id": "ADT-17807#COL28670",
            "name": "Las Joyas de Jordania (Salida el Viernes) - 6 Días - 3 Stars"
        },
        {
            "id": "ADT-17808#COL28673",
            "name": "Las Joyas de Jordania (Salida el Viernes) - 5 Días - 3 Stars"
        },
        {
            "id": "ADT-17814",
            "name": "Portugal Esencial"
        },
        {
            "id": "ADT-17818",
            "name": "Portugal Esencial con Madrid"
        },
        {
            "id": "ADT-17820#COL28705",
            "name": "Endless Jordan (Partenza il Venerdì) - 5 Giorni - 3 Stars"
        },
        {
            "id": "ADT-17821",
            "name": "Lo Mejor de Portugal con Santiago - Lisboa a Oporto"
        },
        {
            "id": "ADT-17822",
            "name": "Endless Jordan (Partenza il Venerdì) - 6 Giorni"
        },
        {
            "id": "ADT-17823",
            "name": "Endless Jordan (Partenza il Venerdì) - 7 Giorni"
        },
        {
            "id": "ADT-17824",
            "name": "Lo Mejor de Portugal con Santiago - Lisboa a Lisboa"
        },
        {
            "id": "ADT-17825",
            "name": "Lo Mejor de Portugal con Santiago y Madrid"
        },
        {
            "id": "ADT-17826#COL28718",
            "name": "Endless Jordan (Partenza il Venerdì) - 8 Giorni - 3 Stars"
        },
        {
            "id": "ADT-17826#COL28719",
            "name": "Endless Jordan (Partenza il Venerdì) - 8 Giorni - 4 Stars"
        },
        {
            "id": "ADT-17827",
            "name": "Circuito Iberico"
        },
        {
            "id": "ADT-17828",
            "name": "Madrid, Andalucía y Cataluña"
        },
        {
            "id": "ADT-17829",
            "name": "Barcelona, Norte de España y Galicia"
        },
        {
            "id": "ADT-17830",
            "name": "Portugal con Madrid, Barcelona y Andalucia"
        },
        {
            "id": "ADT-17831",
            "name": "In the Footsteps of Lawrence of Arabia"
        },
        {
            "id": "ADT-17832",
            "name": "Maravillas de España"
        },
        {
            "id": "ADT-17833",
            "name": "Maravillas de Portugal y España"
        },
        {
            "id": "ADT-17834",
            "name": "Santuarios Marianos"
        },
        {
            "id": "ADT-17835",
            "name": "Barcelona, Côte d'Azur y Roma"
        },
        {
            "id": "ADT-17836",
            "name": "Dos Capitales - Paris y Londres"
        },
        {
            "id": "ADT-17837",
            "name": "Lo Mejor de Italia"
        },
        {
            "id": "ADT-17838",
            "name": "Europa Basica con Londres - París a Lisboa"
        },
        {
            "id": "ADT-17839",
            "name": "Europa Basica con Londres - París a Madrid"
        },
        {
            "id": "ADT-17840",
            "name": "Europa Encantadora - Londres a Lisboa"
        },
        {
            "id": "ADT-17841",
            "name": "Europa Encantadora - Londres a Madrid"
        },
        {
            "id": "ADT-17842",
            "name": "Europa Mediterránea - Lisboa a Roma"
        },
        {
            "id": "ADT-17845",
            "name": "Sri Lanka: The island of tea"
        },
        {
            "id": "ADT-17846",
            "name": "Spain: the guadarrama mountain national park"
        },
        {
            "id": "ADT-17847",
            "name": "Europa Mediterránea - Madrid a Roma"
        },
        {
            "id": "ADT-17848",
            "name": "Magia Europea"
        },
        {
            "id": "ADT-17849",
            "name": "Magia Europea con Londres"
        },
        {
            "id": "ADT-17850",
            "name": "Maravillas de Suiza y Baviera"
        },
        {
            "id": "ADT-17851",
            "name": "Paisajes de Suiza, Alpes y Alemania"
        },
        {
            "id": "ADT-17852",
            "name": "Alemania Fabulosa"
        },
        {
            "id": "ADT-17855",
            "name": "Joyas de Europa Central"
        },
        {
            "id": "ADT-17856",
            "name": "Esencia de Europa Central"
        },
        {
            "id": "ADT-17857",
            "name": "Polonia con Viena y Berlín"
        },
        {
            "id": "ADT-17858",
            "name": "Lo Mejor de Europa - Lisboa a París"
        },
        {
            "id": "ADT-17859",
            "name": "Lo Mejor de Europa - Madrid a París"
        },
        {
            "id": "ADT-17860",
            "name": "Lo Mejor de Europa con Londres - Lisboa a Londres"
        },
        {
            "id": "ADT-17861",
            "name": "Lo Mejor de Europa con Londres - Madrid a Londres"
        },
        {
            "id": "ADT-17862",
            "name": "Clasicos Europeos - Roma a Lisboa"
        },
        {
            "id": "ADT-17863",
            "name": "Clasicos Europeos - Roma a Madrid"
        },
        {
            "id": "ADT-17864",
            "name": "Europa Soñada - Lisboa a Lisboa"
        },
        {
            "id": "ADT-17865",
            "name": "Europa Soñada - Madrid a Madrid"
        },
        {
            "id": "ADT-17866",
            "name": "Gran Tour de los Balcanes"
        },
        {
            "id": "ADT-17867",
            "name": "Lo Mejor de Croacia, Eslovenia y Bosnia"
        },
        {
            "id": "ADT-17869",
            "name": "Capitales de Croacia con Albania, Macedonia y Servia"
        },
        {
            "id": "ADT-17870",
            "name": "Ecuador: The volcanoes' way"
        },
        {
            "id": "ADT-17871#COL28776",
            "name": "The Miami Package - Uma House by Yurbban - 3 Nights"
        },
        {
            "id": "ADT-17871#COL28777",
            "name": "The Miami Package - Uma House by Yurbban - 4 Nights"
        },
        {
            "id": "ADT-17871#COL28778",
            "name": "The Miami Package - Uma House by Yurbban - 5 Nights"
        },
        {
            "id": "ADT-17871#COL28779",
            "name": "The Miami Package - Uma House by Yurbban - 6 Nights"
        },
        {
            "id": "ADT-17871#COL28780",
            "name": "The Miami Package - Uma House by Yurbban - 7 Nights"
        },
        {
            "id": "ADT-17872",
            "name": "United States: Montana - on the trail of nicholas evans"
        },
        {
            "id": "ADT-17873",
            "name": "Portugal: Alentejo - the coast of the dolphins"
        },
        {
            "id": "ADT-17874",
            "name": "Croatia: Discovering dalmatia"
        },
        {
            "id": "ADT-17875",
            "name": "United States: Wyoming/ montana - guiding the herds on the pryor mountains"
        },
        {
            "id": "ADT-17876",
            "name": "Norway: Trekking in the norwegian mountains"
        },
        {
            "id": "ADT-17877",
            "name": "Tour Thailandia con Accompagnatore Locale"
        },
        {
            "id": "ADT-17878",
            "name": "Morocco: The atlas mountains"
        },
        {
            "id": "ADT-17879",
            "name": "Enchanted lapland"
        },
        {
            "id": "ADT-17880",
            "name": "France: Normandy - from Cancale to mont Saint Michel"
        },
        {
            "id": "ADT-17882",
            "name": "Central mexico: the ajusco natural park"
        },
        {
            "id": "ADT-17883",
            "name": "Namibia: The great namibian desert"
        },
        {
            "id": "ADT-17886",
            "name": "The best of Florida"
        },
        {
            "id": "ADT-17893",
            "name": "Tour Thailandia con Accompagnatore Locale Più Estensione Centro Elefanti Sostenibile"
        },
        {
            "id": "ADT-17894",
            "name": "Bangkok 3 notti + Laghi, Montagne e Antiche Città"
        },
        {
            "id": "ADT-17909",
            "name": "The kaleidoscopic Israel"
        },
        {
            "id": "ADT-17910",
            "name": "Tunisia: Fortified villages and dunes of the sahara"
        },
        {
            "id": "ADT-17911",
            "name": "United States: New mexico: apache adventure"
        },
        {
            "id": "ADT-17912",
            "name": "Canada: Alberta - the mountains of kananaskis"
        },
        {
            "id": "ADT-17915",
            "name": "Bangkok 2 notti + Laghi, Montagne e Antiche Città"
        },
        {
            "id": "ADT-17920",
            "name": "Praga y Polonia"
        },
        {
            "id": "ADT-17934",
            "name": "Teamtour East"
        },
        {
            "id": "ADT-17935",
            "name": "Teamtour East - Wednesday"
        },
        {
            "id": "ADT-17936",
            "name": "Teamtour East Complete"
        },
        {
            "id": "ADT-17937",
            "name": "Teamtour East Complete - Monday"
        },
        {
            "id": "ADT-17938",
            "name": "Phnom Penh to Siem Reap Flight 4 Days - Departure on Monday, Thursday"
        },
        {
            "id": "ADT-17939",
            "name": "Teamtour West"
        },
        {
            "id": "ADT-17940",
            "name": "Teamtour West - Wednesday"
        },
        {
            "id": "ADT-17941",
            "name": "Circuito Sueño Americano"
        },
        {
            "id": "ADT-17943",
            "name": "Circuito Norte Increíble"
        },
        {
            "id": "ADT-17944",
            "name": "Circuito Norte Increíble con NYC"
        },
        {
            "id": "ADT-17946",
            "name": "Teamtour West Complete - Monday"
        },
        {
            "id": "ADT-17947",
            "name": "Teamtour West Complete"
        },
        {
            "id": "ADT-17948",
            "name": "Circuito Este Increíble"
        },
        {
            "id": "ADT-17949",
            "name": "Circuito Legado Americano"
        },
        {
            "id": "ADT-17962",
            "name": "Circuito Mini Washington DC - 2 Días"
        },
        {
            "id": "ADT-17963",
            "name": "Circuito Mini Washington DC - 3 Días"
        },
        {
            "id": "ADT-17964",
            "name": "Circuito Sueños Del Oeste"
        },
        {
            "id": "ADT-17965",
            "name": "Circuito Sueños Del Oeste con Los Angeles"
        },
        {
            "id": "ADT-17966",
            "name": "Circuito Aguas y Tierras Del Oeste"
        },
        {
            "id": "ADT-17967",
            "name": "Circuito Aguas y Tierras Del Oeste con Los Angeles"
        },
        {
            "id": "ADT-17971",
            "name": "Circuito Oeste Tradicional"
        },
        {
            "id": "ADT-17973",
            "name": "Circuito Oeste Tradicional con Los Angeles"
        },
        {
            "id": "ADT-17975",
            "name": "Circuito Oeste Mágico"
        },
        {
            "id": "ADT-17976",
            "name": "Circuito Oeste Mágico con Los Angeles"
        },
        {
            "id": "ADT-17978",
            "name": "Nueva York Clásica"
        },
        {
            "id": "ADT-17979",
            "name": "Northern Thailand 4 Nights"
        },
        {
            "id": "ADT-17980",
            "name": "Nueva York Completo"
        },
        {
            "id": "ADT-17981",
            "name": "Orlando Mágico"
        },
        {
            "id": "ADT-17982",
            "name": "Orlando Encantado"
        },
        {
            "id": "ADT-17983",
            "name": "Orlando Fantástico"
        },
        {
            "id": "ADT-17984",
            "name": "Miami Espléndida"
        },
        {
            "id": "ADT-17985",
            "name": "Miami Completo"
        },
        {
            "id": "ADT-17987",
            "name": "Colores de New Orleans"
        },
        {
            "id": "ADT-17988",
            "name": "Boston Histórica"
        },
        {
            "id": "ADT-17990",
            "name": "Washington Tradicional"
        },
        {
            "id": "ADT-17993",
            "name": "Island Essence Tour"
        },
        {
            "id": "ADT-17995",
            "name": "Classic Orlando"
        },
        {
            "id": "ADT-17996",
            "name": "First time in Miami"
        },
        {
            "id": "ADT-17997",
            "name": "Romantic Miami"
        },
        {
            "id": "ADT-18000",
            "name": "San Francisco Maravillosa"
        },
        {
            "id": "ADT-18001",
            "name": "Los Ángeles Fascinante"
        },
        {
            "id": "ADT-18003",
            "name": "Las Vegas Iluminada"
        },
        {
            "id": "ADT-18027",
            "name": "Miami pre and post Cruise"
        },
        {
            "id": "ADT-18350",
            "name": "Mini Tour of Apulia"
        },
        {
            "id": "ADT-18352",
            "name": "Caravan Uzbekistan"
        },
        {
            "id": "ADT-18356",
            "name": "China con Essential Xinjiang"
        },
        {
            "id": "ADT-18357",
            "name": "Canada: Saskatchewan - equestrian stay in the river valley"
        },
        {
            "id": "ADT-18358",
            "name": "England: dartmoor national park"
        },
        {
            "id": "ADT-18362",
            "name": "André Rieu en Viena"
        },
        {
            "id": "ADT-18363",
            "name": "Gran China con Chengdu y Zhangjiajie"
        },
        {
            "id": "ADT-18366",
            "name": "Classico Uzbekistan"
        },
        {
            "id": "ADT-18378",
            "name": "Mini Tour of Apulia and Matera"
        },
        {
            "id": "ADT-18382",
            "name": "Mini Tour Campania Naples and surroundings - Spring Summer"
        },
        {
            "id": "ADT-18383",
            "name": "Mini Tour of Campania Amalfi Coast, Salerno and surroundings - Spring-Summer"
        },
        {
            "id": "ADT-18384",
            "name": "Italy: Sicily - the wine route"
        },
        {
            "id": "ADT-18385",
            "name": "Italy: Trentino: the brenta dolomites"
        },
        {
            "id": "ADT-18386",
            "name": "Iceland: Iceland glaciers"
        },
        {
            "id": "ADT-18387",
            "name": "Mauritius: pearl of the indian ocean"
        },
        {
            "id": "ADT-18388",
            "name": "Tour Sicilia Magica da Palermo - Primavera Estate"
        },
        {
            "id": "ADT-18391",
            "name": "Mini Tour Sicilia Magica da Palermo"
        },
        {
            "id": "ADT-18393",
            "name": "Botswana: Horseback safari in the tuli reserve, limpopo valley"
        },
        {
            "id": "ADT-18396",
            "name": "Mini Tour Sicilia Magica da Catania - Primavera Estate"
        },
        {
            "id": "ADT-18397",
            "name": "Mini Tour Sicilia Magica da Catania - Autunno Inverno"
        },
        {
            "id": "ADT-18400",
            "name": "Tour of Sardinia"
        },
        {
            "id": "ADT-18402",
            "name": "Mini Tour of Sardinia - Saturday Departures"
        },
        {
            "id": "ADT-18405",
            "name": "I Colori del Giappone"
        },
        {
            "id": "ADT-18406",
            "name": "Mini Tour of Sardinia - Tuesday Departures"
        },
        {
            "id": "ADT-18409",
            "name": "Scozia Classica"
        },
        {
            "id": "ADT-18410#COL29555",
            "name": "Irlanda Classica - Tour di gruppo con partenza il Venerdì"
        },
        {
            "id": "ADT-18410#COL29747",
            "name": "Irlanda Classica - Tour di gruppo con partenza il Sabato"
        },
        {
            "id": "ADT-18413",
            "name": "Leyendas de Irlanda"
        },
        {
            "id": "ADT-18416",
            "name": "Leyendas De Las Islas Verdes"
        },
        {
            "id": "ADT-18417",
            "name": "Atenas y Circuito de 4 dias con Meteora y Mykonos"
        },
        {
            "id": "ADT-18457",
            "name": "Bangkok 2 notti + Laghi, Montagne e Antiche Città_VPromo"
        },
        {
            "id": "ADT-18458",
            "name": "Bangkok 3 notti + Laghi, Montagne e Antiche Città_VPromo"
        },
        {
            "id": "ADT-18459",
            "name": "Laghi, Montagne e Antiche Città_VPromo"
        },
        {
            "id": "ADT-18460",
            "name": "Laghi, Montagne e Antiche Città con Centro Elefanti Sostenibile_VPromo"
        },
        {
            "id": "ADT-18461",
            "name": "Tour Thailandia con Accompagnatore Più Centro Elefanti Sostenibile_VPromo"
        },
        {
            "id": "ADT-18462",
            "name": "Tour Thailandia con Accompagnatore Locale_VPromo"
        },
        {
            "id": "ADT-18463",
            "name": "Lykia con Mare con voli da Bergamo"
        },
        {
            "id": "ADT-18472",
            "name": "Dhaalu Atoll Resorts 3 nights Package"
        },
        {
            "id": "ADT-18473",
            "name": "Lykia con Mare con voli da Bologna"
        },
        {
            "id": "ADT-18474",
            "name": "Lykia con Mare con voli da Roma"
        },
        {
            "id": "ADT-18475",
            "name": "Lykia con Mare Solo Land"
        },
        {
            "id": "ADT-18476",
            "name": "Semplicemente Giappone"
        },
        {
            "id": "ADT-18477",
            "name": "Giappone delle Meraviglie"
        },
        {
            "id": "ADT-18479",
            "name": "Acqua d'Arima"
        },
        {
            "id": "ADT-18480",
            "name": "Giappone Medievale"
        },
        {
            "id": "ADT-18481",
            "name": "Giappone in Due - A"
        },
        {
            "id": "ADT-18489",
            "name": "Hwange national park"
        },
        {
            "id": "ADT-18490",
            "name": "Brasil: Rio grande do sul: canyons and waterfalls"
        },
        {
            "id": "ADT-18491",
            "name": "Mozambico: Unexplored paradise"
        },
        {
            "id": "ADT-18492",
            "name": "Tour Calabria"
        },
        {
            "id": "ADT-18493",
            "name": "Giappone in Due - B"
        },
        {
            "id": "ADT-18495",
            "name": "Assaggi delle Isole"
        },
        {
            "id": "ADT-18500",
            "name": "Leyendas Escandinavas y Helsinki"
        },
        {
            "id": "ADT-18508",
            "name": "Mykonos y Santorini"
        },
        {
            "id": "ADT-18511",
            "name": "Estensione 1 notte a Tokyo"
        },
        {
            "id": "ADT-18512",
            "name": "Estensione 1 notte a Kyoto"
        },
        {
            "id": "ADT-18513",
            "name": "Estensione 1 notte a Osaka"
        },
        {
            "id": "ADT-18524",
            "name": "Sapori Birmani"
        },
        {
            "id": "ADT-18525",
            "name": "Immagini della Birmania"
        },
        {
            "id": "ADT-18526#PRV29978",
            "name": "Estensione \"I Colori del Giappone\" - Pre Tour in Tokyo"
        },
        {
            "id": "ADT-18526#PRV29979",
            "name": "Estensione \"I Colori del Giappone\" - Pre Tour in Tokyo - Upgrade Hotel"
        },
        {
            "id": "ADT-18526#PRV29980",
            "name": "Estensione \"I Colori del Giappone\" - Post Tour in Kyoto"
        },
        {
            "id": "ADT-18526#PRV29981",
            "name": "Estensione \"I Colori del Giappone\" - Post Tour in Kyoto - Upgrade Hotel"
        },
        {
            "id": "ADT-18544",
            "name": "Tour Sicilia Magica da Catania - Primavera Estate"
        },
        {
            "id": "ADT-18545",
            "name": "Tour Sardegna"
        },
        {
            "id": "ADT-18546",
            "name": "Tour Campania Primavera - Estate"
        },
        {
            "id": "ADT-18547",
            "name": "Tour Calabria"
        },
        {
            "id": "ADT-18548",
            "name": "Mini Tour Sicilia Magica da Palermo"
        },
        {
            "id": "ADT-18549",
            "name": "Mini Tour Sicilia Magica da Catania - Primavera Estate"
        },
        {
            "id": "ADT-18551",
            "name": "Mini Tour Sicilia Magica da Catania - Autunno Inverno"
        },
        {
            "id": "ADT-18552",
            "name": "Mini Tour Sardegna - partenza di sabato"
        },
        {
            "id": "ADT-18553",
            "name": "Mini Tour Sardegna - partenza di martedì"
        },
        {
            "id": "ADT-18554",
            "name": "Mini Tour Puglia e Matera"
        },
        {
            "id": "ADT-18555",
            "name": "Mini Tour Puglia"
        },
        {
            "id": "ADT-18556",
            "name": "Mini Tour Campania Napoli e dintorni - Primavera Estate"
        },
        {
            "id": "ADT-18557",
            "name": "Mini Tour Campania Costiera Amalfitana, Salerno e dintorni – Primavera-Estate"
        },
        {
            "id": "ADT-18558",
            "name": "Gran Tour Puglia e Matera"
        },
        {
            "id": "ADT-18560",
            "name": "Angkor Wat"
        },
        {
            "id": "ADT-18561",
            "name": "Camboya Conveniente"
        },
        {
            "id": "ADT-18562",
            "name": "Reino de Khmer"
        },
        {
            "id": "ADT-18563",
            "name": "Camboya Esencial"
        },
        {
            "id": "ADT-18564",
            "name": "Tour:  “da Efeso a Istanbul e a Cappadocia” con voli da Bari"
        },
        {
            "id": "ADT-18566",
            "name": "Luang Prabang"
        },
        {
            "id": "ADT-18567",
            "name": "Esencia de Laos"
        },
        {
            "id": "ADT-18568",
            "name": "Laos y Camboya"
        },
        {
            "id": "ADT-18570",
            "name": "Esencia de Myanmar"
        },
        {
            "id": "ADT-18571",
            "name": "Vive Myanmar"
        },
        {
            "id": "ADT-18572",
            "name": "Italy: Sardinia: the green coast"
        },
        {
            "id": "ADT-18573",
            "name": "Bellezas de Myanmar"
        },
        {
            "id": "ADT-18574",
            "name": "Enchanting Myanmar"
        },
        {
            "id": "ADT-18575",
            "name": "Lives of Myanmar"
        },
        {
            "id": "ADT-18587",
            "name": "United States: Colorado - the Rio Grande national forest"
        },
        {
            "id": "ADT-18588",
            "name": "United States: California - Yosemite park expedition"
        },
        {
            "id": "ADT-18591",
            "name": "Tour Il Meglio di Vietnam e Cambogia - partenze esclusive min. 10 partecipanti"
        },
        {
            "id": "ADT-18592",
            "name": "Cracovia y Varsovia"
        },
        {
            "id": "ADT-18593",
            "name": "Tour in Blu - solo land"
        },
        {
            "id": "ADT-18594",
            "name": "Fantasia Estate  - solo land"
        },
        {
            "id": "ADT-18595",
            "name": "Tour Istanbul e Cappadocıa Turchıa - solo land"
        },
        {
            "id": "ADT-18596",
            "name": "Splendido Estate - solo land"
        },
        {
            "id": "ADT-18609",
            "name": "Sapori del Mediterraneo - LYKIA con voli da Bergamo"
        },
        {
            "id": "ADT-18610",
            "name": "Hungary: the ride of the danube"
        },
        {
            "id": "ADT-18611",
            "name": "Central mexico: discovering the colonial \"PUEBLOS\""
        },
        {
            "id": "ADT-18612",
            "name": "Portugal: Azores – Faial: the island of 10 volcanoes"
        },
        {
            "id": "ADT-18613",
            "name": "Spain: Andalucia -  Tarifa's beach ride"
        },
        {
            "id": "ADT-18614",
            "name": "Uzbekistán Clásico"
        },
        {
            "id": "ADT-18615",
            "name": "Sapori del Mediterraneo - LYKIA con voli da Bologna"
        },
        {
            "id": "ADT-18616",
            "name": "Sapori del Mediterraneo - LYKIA con voli da Roma"
        },
        {
            "id": "ADT-18617",
            "name": "Sapori del Mediterraneo - LYKIA Solo Land"
        },
        {
            "id": "ADT-18619",
            "name": "Authentic Senegal"
        },
        {
            "id": "ADT-18620",
            "name": "Uruguay: The wild lands of the criollos"
        },
        {
            "id": "ADT-18621",
            "name": "Italy: Molise: the ancient tratturi of molise"
        },
        {
            "id": "ADT-18622",
            "name": "Italy, Trentino: Lake Nambino"
        },
        {
            "id": "ADT-18623",
            "name": "Exotico Esencias 6 Noches"
        },
        {
            "id": "ADT-18642",
            "name": "Descubrimiento del Ecuador + Extension Inter Islas Galapagos - San Cristobal"
        },
        {
            "id": "ADT-18645",
            "name": "Descubrimiento del Ecuador"
        },
        {
            "id": "ADT-18648",
            "name": "Descubrimiento del Ecuador + Extension Inter Islas Galapagos - Santa Cruz"
        },
        {
            "id": "ADT-18656",
            "name": "Contrastes da Turquia"
        },
        {
            "id": "ADT-18657",
            "name": "Tour Il Meglio di Sri Lanka - partenze esclusive min. 10 partecipanti"
        },
        {
            "id": "ADT-18658",
            "name": "Istambul e Praias Do Mar Egeu"
        },
        {
            "id": "ADT-18660",
            "name": "Descubrimiento del Ecuador + Extension Crucero Archipel I Itinerario A"
        },
        {
            "id": "ADT-18663",
            "name": "O Melhor da Turquia"
        },
        {
            "id": "ADT-18904",
            "name": "Tour Tunisia Classica"
        },
        {
            "id": "ADT-18905",
            "name": "Tour Tunisia Deserto e Mare"
        },
        {
            "id": "ADT-18911",
            "name": "Paisagens da Turquia"
        },
        {
            "id": "ADT-18915",
            "name": "Descubrimiento del Ecuador + Extension Crucero Archipel I Itinerario B"
        },
        {
            "id": "ADT-18916",
            "name": "Baa Atoll  - 04  Days - 03 Nights Package - Maldives"
        },
        {
            "id": "ADT-18917",
            "name": "Extension Costa Pacifica Puerto Lopez"
        },
        {
            "id": "ADT-18924#COL31032",
            "name": "Lendas Escandinavas - Circuito Básico"
        },
        {
            "id": "ADT-18924#COL31077",
            "name": "Lendas Escandinavas - Circuito Básico e Helsinque"
        },
        {
            "id": "ADT-18924#COL31079",
            "name": "Lendas Escandinavas - Circuito Básico e os Bálticos"
        },
        {
            "id": "ADT-18948",
            "name": "Brasil y Sus Encantos (Foz do Iguazú - Rio de Janeiro - Paraty)"
        },
        {
            "id": "ADT-18962#COL31194",
            "name": "Leyendas Escandinavas - Circuito Base"
        },
        {
            "id": "ADT-18962#COL31196",
            "name": "Leyendas Escandinavas - Circuito Base y Helsinki"
        },
        {
            "id": "ADT-18962#COL31198",
            "name": "Leyendas Escandinavas - Circuito Base y Bálticas"
        },
        {
            "id": "ADT-18963",
            "name": "Tour Vietnam da Sogno - partenza esclusiva min. 10 partecipanti"
        },
        {
            "id": "ADT-18964",
            "name": "Ecuador Aventura"
        },
        {
            "id": "ADT-18966",
            "name": "Essential Paris - 02 nights"
        },
        {
            "id": "ADT-18967",
            "name": "Brasil y Sus Encantos (Foz do Iguazú - Rio de Janeiro - Paraty - Salvador)"
        },
        {
            "id": "ADT-18968",
            "name": "Best of Beaune - 03 nights"
        },
        {
            "id": "ADT-18969",
            "name": "Brasil y Sus Encantos (Rio de Janeiro - Paraty - Salvador)"
        },
        {
            "id": "ADT-18970",
            "name": "Amazonia y Sus Encantos (Manaus - Amazonia)"
        },
        {
            "id": "ADT-18971",
            "name": "Salvador y Sus Encantos"
        },
        {
            "id": "ADT-18972",
            "name": "Tonle Sap Half Loop via Battambang"
        },
        {
            "id": "ADT-18973",
            "name": "Rio y Sus Encantos (Rio de Janeiro - Paraty)"
        },
        {
            "id": "ADT-18976",
            "name": "Ecuador Trekking Largo"
        },
        {
            "id": "ADT-18977",
            "name": "Tour il Meglio della Thailandia e spiagge di Phuket - partenze esclusive min. 10 partecipanti"
        },
        {
            "id": "ADT-18978",
            "name": "Ecuador Trekking Corto"
        },
        {
            "id": "ADT-18980",
            "name": "Autotour: Descubre Ecuador a tu Manera 10 Días"
        },
        {
            "id": "ADT-18986",
            "name": "In Style Concept Paris - 03 nights"
        },
        {
            "id": "ADT-18987",
            "name": "Best of Impressionism - 03 nights"
        },
        {
            "id": "ADT-18991",
            "name": "Tour classico dell'Oman"
        },
        {
            "id": "ADT-18992#COL31270",
            "name": "Safari Nyota Melia - Group tour"
        },
        {
            "id": "ADT-18992#PRV31273",
            "name": "Safari Nyota Melia - Private Tour"
        },
        {
            "id": "ADT-18992#PRV31274",
            "name": "Safari Nyota Melia - Tour Private with Lake Eyasi Extension"
        },
        {
            "id": "ADT-18993",
            "name": "Tour Omán Regular"
        },
        {
            "id": "ADT-18999",
            "name": "Autotour: Descubre Ecuador a tu Manera 7 Días"
        },
        {
            "id": "ADT-19004",
            "name": "The Great Migration Melia"
        },
        {
            "id": "ADT-19014",
            "name": "Bulgaria: the Balkan mountains"
        },
        {
            "id": "ADT-19015",
            "name": "Boa vista: the wild island of boa vista"
        },
        {
            "id": "ADT-19016",
            "name": "Costa Rica: Following in the Footsteps of the Conquistadors"
        },
        {
            "id": "ADT-19030",
            "name": "Camargue: Gipsy Land"
        },
        {
            "id": "ADT-19035",
            "name": "Italy - Tuscany: a taste of maremma"
        },
        {
            "id": "ADT-19037",
            "name": "Italy - Basilicata: the stones of matera and the murgia materana park"
        },
        {
            "id": "ADT-19038",
            "name": "Italy: Sicily: the madonie natural park"
        },
        {
            "id": "ADT-19041",
            "name": "Italy - Molise: Wwf oasis guardiaregia-campochiaro"
        },
        {
            "id": "ADT-19042",
            "name": "Italy: Sicily: coast to coast"
        },
        {
            "id": "ADT-19051",
            "name": "Slovenia: the trails of the white horses"
        },
        {
            "id": "ADT-19054",
            "name": "South Africa: western cape - the region of the wineries"
        },
        {
            "id": "ADT-19064#COL31456",
            "name": "New York Celebration Package - The New Yorker A Wyndham Hotel - 4 Nights"
        },
        {
            "id": "ADT-19064#COL31457",
            "name": "New York Celebration Package - The New Yorker A Wyndham Hotel - 5 Nights"
        },
        {
            "id": "ADT-19064#COL31458",
            "name": "New York Celebration Package - The New Yorker A Wyndham Hotel - 7 Nights"
        },
        {
            "id": "ADT-19065#COL31459",
            "name": "New York Celebration Package - The Manhattan at Time Square Hotel - 4 Nights"
        },
        {
            "id": "ADT-19065#COL31460",
            "name": "New York Celebration Package - The Manhattan at Time Square Hotel - 5 Nights"
        },
        {
            "id": "ADT-19065#COL31461",
            "name": "New York Celebration Package - The Manhattan at Time Square Hotel - 7 Nights"
        },
        {
            "id": "ADT-19066#COL31462",
            "name": "New York Celebration Package - The Belvedere Hotel - 4 Nights"
        },
        {
            "id": "ADT-19066#COL31463",
            "name": "New York Celebration Package - The Belvedere Hotel - 5 Nights"
        },
        {
            "id": "ADT-19066#COL31464",
            "name": "New York Celebration Package - The Belvedere Hotel - 7 Nights"
        },
        {
            "id": "ADT-19067#COL31465",
            "name": "New York Celebration Package - Park Central Hotel New York - 4 Nights"
        },
        {
            "id": "ADT-19067#COL31466",
            "name": "New York Celebration Package - Park Central Hotel New York - 5 Nights"
        },
        {
            "id": "ADT-19067#COL31467",
            "name": "New York Celebration Package - Park Central Hotel New York - 7 Nights"
        },
        {
            "id": "ADT-19149",
            "name": "3 Giorni Tra Natura e Storia"
        },
        {
            "id": "ADT-19150",
            "name": "2 Giorni I Sentieri del Fiume Kwai"
        },
        {
            "id": "ADT-19152#COL31638",
            "name": "Manhattan Xpress Package - The Manhattan at Time Square Hotel - 5 Nights"
        },
        {
            "id": "ADT-19152#COL31639",
            "name": "Manhattan Xpress Package - The Manhattan at Time Square Hotel - 6 Nights"
        },
        {
            "id": "ADT-19152#COL31640",
            "name": "Manhattan Xpress Package - The Manhattan at Time Square Hotel - 7 Nights"
        },
        {
            "id": "ADT-19152#COL31641",
            "name": "Manhattan Xpress Package - The Manhattan at Time Square Hotel - 8 Nights"
        },
        {
            "id": "ADT-19152#COL31642",
            "name": "Manhattan Xpress Package - The Manhattan at Time Square Hotel - 9 Nights"
        },
        {
            "id": "ADT-19152#COL31643",
            "name": "Manhattan Xpress Package - The Manhattan at Time Square Hotel - 10 Nights"
        },
        {
            "id": "ADT-19153",
            "name": "Fin de año en Europa del Este (en Viena)"
        },
        {
            "id": "ADT-19155",
            "name": "Meraviglie del Pacifico - 7 Giorni"
        },
        {
            "id": "ADT-19157",
            "name": "Chiapas e Yucatan"
        },
        {
            "id": "ADT-19158",
            "name": "Tour Gemme del Marocco - partenze esclusive min. 8 partecipanti"
        },
        {
            "id": "ADT-19159#COL31659",
            "name": "Manhattan Xpress Package - The New Yorker a Wyndham Hotel - 5 Nights"
        },
        {
            "id": "ADT-19159#COL31660",
            "name": "Manhattan Xpress Package - The New Yorker a Wyndham Hotel - 6 Nights"
        },
        {
            "id": "ADT-19159#COL31661",
            "name": "Manhattan Xpress Package - The New Yorker a Wyndham Hotel - 7 Nights"
        },
        {
            "id": "ADT-19159#COL31662",
            "name": "Manhattan Xpress Package - The New Yorker a Wyndham Hotel - 8 Nights"
        },
        {
            "id": "ADT-19159#COL31663",
            "name": "Manhattan Xpress Package - The New Yorker a Wyndham Hotel - 9 Nights"
        },
        {
            "id": "ADT-19159#COL31664",
            "name": "Manhattan Xpress Package - The New Yorker a Wyndham Hotel - 10 Nights"
        },
        {
            "id": "ADT-19160#COL31665",
            "name": "Manhattan Xpress Package - Park Central New York Hotel - 5 Nights"
        },
        {
            "id": "ADT-19160#COL31666",
            "name": "Manhattan Xpress Package - Park Central New York Hotel - 6 Nights"
        },
        {
            "id": "ADT-19160#COL31667",
            "name": "Manhattan Xpress Package - Park Central New York Hotel - 7 Nights"
        },
        {
            "id": "ADT-19160#COL31668",
            "name": "Manhattan Xpress Package - Park Central New York Hotel - 8 Nights"
        },
        {
            "id": "ADT-19160#COL31669",
            "name": "Manhattan Xpress Package - Park Central New York Hotel - 9 Nights"
        },
        {
            "id": "ADT-19160#COL31670",
            "name": "Manhattan Xpress Package - Park Central New York Hotel - 10 Nights"
        },
        {
            "id": "ADT-19161",
            "name": "Mini Tour - Partenza Speciale Catrinas e Giorno dei Morti 2026"
        },
        {
            "id": "ADT-19190",
            "name": "Maravillas del Pacifico - 8 Días"
        },
        {
            "id": "ADT-19192",
            "name": "Estensione di 1 notte a Cancun"
        },
        {
            "id": "ADT-19194",
            "name": "Descubra Croacia (Hot Deal)"
        },
        {
            "id": "ADT-19198",
            "name": "Normandia y Bretaña"
        },
        {
            "id": "ADT-19199",
            "name": "Paises Bajos - Normandia y Bretaña"
        },
        {
            "id": "ADT-19200",
            "name": "México Express - Salida Especial Catrinas y Día de Muertos"
        },
        {
            "id": "ADT-19217",
            "name": "Un Villancico Navideño en Inglaterra"
        },
        {
            "id": "ADT-19218",
            "name": "Zanzibar: island of spices"
        },
        {
            "id": "ADT-19227",
            "name": "Edo: Spirito e Tempo"
        },
        {
            "id": "ADT-1948",
            "name": "Yucatan Complete"
        },
        {
            "id": "ADT-2040",
            "name": "Classic Laos - Departure on Monday, Friday"
        },
        {
            "id": "ADT-2043",
            "name": "Laos Tour from Pakbeng 5 Days - Departure on Thursday"
        },
        {
            "id": "ADT-214",
            "name": "Classic Vietnam - From North To South 7 Days - Departure on Monday"
        },
        {
            "id": "ADT-223",
            "name": "Short Tour in Central Vietnam - Departure on Wednesday"
        },
        {
            "id": "ADT-230",
            "name": "Laos Tour from Vientiane 8 Days - Departure on Thursday"
        },
        {
            "id": "ADT-2319",
            "name": "Classic Vietnam - From North to South 6 Days - Departure on Tuesday"
        },
        {
            "id": "ADT-2324",
            "name": "Tour in North Vietnam 3 Days - Departure on Monday, Wednesday"
        },
        {
            "id": "ADT-2344",
            "name": "Siem Reap, Battambang and Phnom Penh 6 Days - Departure on Tuesday"
        },
        {
            "id": "ADT-2351",
            "name": "Phnom Penh to Siem Reap Road 4 Days - Departure on Monday, Thursday"
        },
        {
            "id": "ADT-2376",
            "name": "Phnom Penh to Siem Reap Flight - Departure on Monday, Thursday"
        },
        {
            "id": "ADT-238",
            "name": "Laos Tour from Vientiane 4 Days - Departure on Thursday, Sunday"
        },
        {
            "id": "ADT-241",
            "name": "Grand Tour from Bangkok 11 Nights"
        },
        {
            "id": "ADT-2625",
            "name": "Amazing Luang Prabang - Departure on Monday, Friday"
        },
        {
            "id": "ADT-265",
            "name": "Siem Reap 4 Days - Departure on Monday, Friday"
        },
        {
            "id": "ADT-266",
            "name": "Phnom Penh to Siem Reap Road 5 Days - Departure on Monday, Thursday"
        },
        {
            "id": "ADT-268",
            "name": "Siem Reap 5 Days - Departure on Monday"
        },
        {
            "id": "ADT-269",
            "name": "Siem Reap 4 Days - Departure on Tuesday, Friday"
        },
        {
            "id": "ADT-270",
            "name": "Siem Reap 3 Days - Departure on Tuesday, Friday"
        },
        {
            "id": "ADT-271",
            "name": "Siem Reap 2 Days - Departure on Wednesday, Saturday"
        },
        {
            "id": "ADT-2955",
            "name": "Laos Tour from Vientiane 5 Days - Departure on Thursday, Sunday"
        },
        {
            "id": "ADT-2957",
            "name": "From Luang Prabang 5 Days - Departure on Friday"
        },
        {
            "id": "ADT-2977",
            "name": "1 Night in Kanchanaburi - Departure on Wednesday, Sunday"
        },
        {
            "id": "ADT-2980",
            "name": "From Bangkok to Khao Sok"
        },
        {
            "id": "ADT-2983",
            "name": "Laos Tour from Pakbeng 8 Days - Departure on Thursday"
        },
        {
            "id": "ADT-3073",
            "name": "2 nights: Northern Thailand Mae Hong Son - Chiang Mai"
        },
        {
            "id": "ADT-3074",
            "name": "Northern Thailand: 3 Nights, Chiang Rai - Chiang Mai"
        },
        {
            "id": "ADT-3075",
            "name": "Northern Thailand Sukhothai: 4 Nights, Chiang Rai - Chiang Mai"
        },
        {
            "id": "ADT-3076",
            "name": "Link to Laos: Sukhothai - Nan"
        },
        {
            "id": "ADT-3632",
            "name": "Northern Thailand Sukhothai: 3 Nights - Chiang Rai - Chiang Mai"
        },
        {
            "id": "ADT-3633",
            "name": "Central Thailand and Sukhothai - Departure on Monday, Thursday"
        },
        {
            "id": "ADT-3800",
            "name": "Chiang Rai - Chiang Mai - Sukhothai - Ayutthaya - Bangkok"
        },
        {
            "id": "ADT-5327",
            "name": "3 Nights in Bangkok"
        },
        {
            "id": "ADT-5574",
            "name": "North-South Combination Transfer to Phnom Penh"
        },
        {
            "id": "ADT-5602",
            "name": "2 Nights in Bangkok"
        },
        {
            "id": "ADT-5735",
            "name": "The Best of Mexico"
        },
        {
            "id": "ADT-6186",
            "name": "6 Giorni Around Thailand Casual"
        },
        {
            "id": "ADT-6187",
            "name": "5 Giorni Around Thailand Casual"
        },
        {
            "id": "ADT-6188",
            "name": "Tour nel Nord della Thailandia, 4 Giorni - Partenza ogni Mercoledì"
        },
        {
            "id": "ADT-6189",
            "name": "4 Giorni Around Thailand Casual"
        },
        {
            "id": "ADT-6302",
            "name": "1 Night in Bangkok"
        },
        {
            "id": "ADT-6304",
            "name": "Tour in North Vietnam - Departure on Sunday"
        },
        {
            "id": "ADT-6409",
            "name": "Northern Thailand: 2 Nights, Chiang Rai - Chiang Mai"
        },
        {
            "id": "ADT-6473",
            "name": "Center Thailand and Old Capital - 1 Night in Khao Yai"
        },
        {
            "id": "ADT-6515",
            "name": "From Bangkok to Siem Reap"
        },
        {
            "id": "ADT-6537",
            "name": "Siem Reap 3 Days - Departure on Wednesday, Saturday"
        },
        {
            "id": "ADT-6561",
            "name": "Khao Sok National Park by train from Bangkok"
        },
        {
            "id": "ADT-6628",
            "name": "2 Nights in Khao Sok national park leaving from Phuket"
        },
        {
            "id": "ADT-6630",
            "name": "Siem Reap, Battambang and Phnom Penh 5 Days - Departure on Wednesday"
        },
        {
            "id": "ADT-6632",
            "name": "Siem Reap, Battambang and Phnom Penh 7 Days - Departure on Monday"
        },
        {
            "id": "ADT-6664",
            "name": "Srilanka essenziale in privato 4 notti"
        },
        {
            "id": "ADT-6668",
            "name": "Tour privato in  Srilanka di 6 giorni 5 notti cod 02"
        },
        {
            "id": "ADT-6670",
            "name": "Tour privato in Srilanka di 7 g 6 n in Italiano. Cod 03"
        },
        {
            "id": "ADT-6673",
            "name": "Tour privato Srilanka 7 notti"
        },
        {
            "id": "ADT-6674",
            "name": "Mini Tour (04 days)"
        },
        {
            "id": "ADT-6676",
            "name": "Tour privato in Srilanka di 8g/7n incluso Yala Park"
        },
        {
            "id": "ADT-6682",
            "name": "Ceylon Splendors Trail - Italian"
        },
        {
            "id": "ADT-6683",
            "name": "Srilanka tour privati 9 notti"
        },
        {
            "id": "ADT-6685",
            "name": "Ceylon Essential Trail"
        },
        {
            "id": "ADT-6689",
            "name": "Ceylon Cultural Trail - (06 Days)"
        },
        {
            "id": "ADT-6693",
            "name": "Ceylon Cultural Trail - (07 Days)"
        },
        {
            "id": "ADT-6698",
            "name": "Ceylon Cultural Trail (08 Days)"
        },
        {
            "id": "ADT-6705",
            "name": "Ceylon Discovery Trail"
        },
        {
            "id": "ADT-6706",
            "name": "Ceylon Splendors Trail"
        },
        {
            "id": "ADT-6759",
            "name": "Mexico City, Chiapas And Yucatan"
        },
        {
            "id": "ADT-6932",
            "name": "Tour di Gruppo a partenze garantite estate"
        },
        {
            "id": "ADT-6933",
            "name": "SIC Salidas Regulares Invierno"
        },
        {
            "id": "ADT-6949",
            "name": "From Bangkok to Eastern Thailand"
        },
        {
            "id": "ADT-6953",
            "name": "From Lao/Thai border to Bangkok: Surin - Korat"
        },
        {
            "id": "ADT-6955",
            "name": "From North to Bangkok: Chiang Rai - Chiang Mai through Kanchanaburi"
        },
        {
            "id": "ADT-6977",
            "name": "From North to Bangkok through Phitsanulok"
        },
        {
            "id": "ADT-6989",
            "name": "Link to Cambodia"
        },
        {
            "id": "ADT-6990",
            "name": "Link to Laos: Nan"
        },
        {
            "id": "ADT-7002",
            "name": "Bangkok - Damnern Saduak - Kanchanaburi - Ayutthaya"
        },
        {
            "id": "ADT-7004",
            "name": "From Eastern Thailand to Bangkok: Surin-Buriram-Korat"
        },
        {
            "id": "ADT-7015",
            "name": "Kanchanaburi - Chumphon - Khao Sok"
        },
        {
            "id": "ADT-7016",
            "name": "From South to Bangkok: Khao Sok - Chumphon - Kanchanaburi - Ayutthaya"
        },
        {
            "id": "ADT-7070",
            "name": "Mayan Mexico"
        },
        {
            "id": "ADT-752",
            "name": "Colonial, Ecological and Archaeological Yucatan"
        },
        {
            "id": "ADT-7566",
            "name": "From Bangkok to Chiang Mai"
        },
        {
            "id": "ADT-7567",
            "name": "3 nights - From Bangkok to Chiang Mai"
        },
        {
            "id": "ADT-7571",
            "name": "Tour nel Nord della Thailandia, 4 Giorni - Partenza Ogni Sabato"
        },
        {
            "id": "ADT-7573",
            "name": "Tour di gruppo partenze garantite SIC inverno"
        },
        {
            "id": "ADT-7575",
            "name": "From Bangkok to Kanchanaburi"
        },
        {
            "id": "ADT-7579",
            "name": "1 Night in Bangkok - Departure on Wednesday, Sunday"
        },
        {
            "id": "ADT-7580",
            "name": "3 Nights package in Bangkok"
        },
        {
            "id": "ADT-7586",
            "name": "Le Gemme del Siam, 6 Giorni"
        },
        {
            "id": "ADT-7665",
            "name": "Bangkok to Southern Thailand - Bangkok to Surat Thani by Train"
        },
        {
            "id": "ADT-7766",
            "name": "2 Nights in Bangkok with Floating Market"
        },
        {
            "id": "ADT-7767",
            "name": "Bangkok - Damnern Saduak - Kanchanaburi - Sangkla Buri"
        },
        {
            "id": "ADT-7769",
            "name": "From Bangkok to Khao Sok"
        },
        {
            "id": "ADT-7801",
            "name": "Hanoi to Sapa by Train - Departure on Friday"
        },
        {
            "id": "ADT-7803",
            "name": "Classic Vietnam - From North to South 5 Days - Departure on Wednesday"
        },
        {
            "id": "ADT-7813",
            "name": "Saigon Tour - Departure on Friday"
        },
        {
            "id": "ADT-7819",
            "name": "The Yucatan and the Mayans"
        },
        {
            "id": "ADT-7870",
            "name": "Treasure of United Arab Emirates"
        },
        {
            "id": "ADT-7875",
            "name": "Grand Tour of United Arab Emirates"
        },
        {
            "id": "ADT-7876",
            "name": "Magnificent of United Arab Emirates"
        },
        {
            "id": "ADT-7877",
            "name": "Best of United Arab Emirates"
        },
        {
            "id": "ADT-7980",
            "name": "Pechino e Shanghai"
        },
        {
            "id": "ADT-8143",
            "name": "Giordania Classica (Partenza di Domenica)"
        },
        {
            "id": "ADT-8145",
            "name": "Giordania Classica (Partenza di Martedì)"
        },
        {
            "id": "ADT-8147",
            "name": "Giordania rapida"
        },
        {
            "id": "ADT-8148",
            "name": "Minitour Giordania e Mar Morto (Petra Express e Mar Morto)"
        },
        {
            "id": "ADT-8149",
            "name": "Jordan Highlights"
        },
        {
            "id": "ADT-8150",
            "name": "Minitour della Giordania (Petra Express)"
        },
        {
            "id": "ADT-8151",
            "name": "Giordania e Mar Morto"
        },
        {
            "id": "ADT-8152",
            "name": "Giordania e Wadi Rum (Partenza di Domenica)"
        },
        {
            "id": "ADT-8192",
            "name": "Essential China (da Pechino)"
        },
        {
            "id": "ADT-8232",
            "name": "I Tesori della Cina"
        },
        {
            "id": "ADT-8235",
            "name": "Grande Cina da Pechino a Hong Kong"
        },
        {
            "id": "ADT-8300",
            "name": "La Bella Cina"
        },
        {
            "id": "ADT-8323",
            "name": "Jogjakarta Package"
        },
        {
            "id": "ADT-8327",
            "name": "Bali - Ijen - Bali Package"
        },
        {
            "id": "ADT-8330",
            "name": "Luxury Bali"
        },
        {
            "id": "ADT-8331",
            "name": "Batik - The Real Javanese Experience"
        },
        {
            "id": "ADT-8624",
            "name": "Panorama of Uganda Safari"
        },
        {
            "id": "ADT-8634",
            "name": "Thousand Hills Safari"
        },
        {
            "id": "ADT-8865",
            "name": "Classic Oman"
        },
        {
            "id": "ADT-8916",
            "name": "Laos Tour from Vientiane 4 Days - No National Museum"
        },
        {
            "id": "ADT-8918",
            "name": "Siem Reap to Phnom Penh via Kampong Thom - Departure on Tuesday"
        },
        {
            "id": "ADT-8923",
            "name": "Tour in North Vietnam from Hanoi - Departure on Saturday"
        },
        {
            "id": "ADT-8947",
            "name": "Giordania Classica (Partenza di Sabato)"
        }
    ]
}
```

With this operation we will obtain the customizable data from closed tour provider.

\- **dataSheetId**: With this mandatory parameter we will indicate which closed tour we want his data for.

```
curl --location 'http://default.localhost/resources/static/closedtour/datasheet/ADT-10144' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "auditData": {
        "timestamp": "2025-07-28 08:15:58",
        "processTime": 141,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw",
        "traceId": "A7804ED4-C8B5-417F-A6CB-DD0439668BCF",
        "server": "http://localhost:30000"
    },
    "dataSheet": [
        {
            "language": "IT",
            "translation": {
                "name": "Classico Bali da Ubud + Java Classico - SIC",
                "description": "
Giorno 1: UbudBali - Ubud
\nArrivo all'aeroporto di Bali e trasferimento a Ubud. Pernottamento in hotel a Ubud, capitale culturale dell’isola.
Giorno 2: UbudForesta delle scimmie a Ubud, Mengwi, Tanah Lot (Colazione)
\nDopo colazione, mattinata da dedicare al relax o per una passeggiata in autonomia nel centro di Ubud. Dopo pranzo (non incluso), la prima visita e’ presso la foresta delle scimmie in Ubud, la conosciuta riserva naturale con un bosco stupendo popolato da più di 340 macachi dalla lunga coda. Si prosegue per la visita al tempio di \"Taman Ayun“ appartenente alla famiglia reale di Mengwi. Il tempio, in perfetta architettura balinese, risale all'anno 1.600 ed e' usato per cerimonie importanti. Infine si raggiunge la costa sud ovest per ammirare al tramonto il famoso tempio di Tanah Lot, dedicato alle divinità del mare che, si narra, proteggano tutt’ora i pescatori e naviganti. Il tempio gode di una straordinaria posizione su una roccia circondata dall’oceano indiano, che durante l’alta marea si trasforma in un isolotto avvolto dalle onde. Rientro in Hotel e pernottamento.
Giorno 3: UbudBelimbing e nord di Bali (Colazione, Pranzo)
\nPartenza 08:00 dall'hotel. Tour di un'intera giornata che raggiunge la costa nord. Si visita il tempio di “Ulun Danu” a Bedugul, situato nel lago Bratan. L'immagine del tempio sul lago è fra le più fotografate di Bali. Successivamente proseguiamo per ammirare la cascata di Git Git situata a nord di Bedugul, che si raggiunge con una breve passeggiata attraversando la verde foresta tropicale. Pranzo in un ristorante locale. Continuiamo a nord visitando il tempio buddista Brahma Vihara Arama. Dopo si arriva nella bellissima zona di Belimbing, dove effettueremo una breve passeggiata in questa area ancora quasi vergine con bellissimi paesaggi e risaie. Rientro in hotel nel tardo pomeriggio. Pernottamento a Ubud.
Giorno 4: UbudKintamani e Besakih (Colazione, Pranzo)
\nPartenza alle 08:00. Dopo circa 30 minuti raggiungiamo le splendide terrazze di riso di Tegalalang. Effettueremo una piacevole passeggiata di circa 20 minuti in un’area particolare poco frequentata dal turismo abituale, ammirando il tradizionale sistema di irrigazione chiamato “Subak”.  Poi procediamo verso nord per raggiungere il villaggio di Kintamani con una vista stupenda sul Monte Batur e sull'omonimo lago sottostante. Altitudine 1.100m. Pranzo presso un ristorante locale con vista panoramica. Nel pomeriggio proseguiamo verso il Tempio Madre di Besakih, situato a circa 1000 m sul livello del mare, sulle pendici del più grande e attivo vulcano di Bali, il Gunung Agung (3.142 m) considerato dai Balinesi \"l'ombelico del mondo\". Sulla via del ritorno a Ubud visitiamo l'antico tribunale di giustizia \"Kerta Gosa\" a Klungkung, il cui particolarissimo soffitto dipinto, mostra le pene che erano inflitte ai condannati. Rientro in Hotel a Ubud e pernottamento.
Giorno 5: YogyakartaBali - Yogyakarta (Colazione)
\nMattinata libera fino al trasferimento dall’aeroporto all’hotel per il volo in direzione Yogyakarta (volo non incluso). Incontro con la guida e trasferimento dall’aeroporto all’hotel a Yogyakarta. Tempo libero per scoprire in autonomia Yogyakarta. Cena libera e pernottamento a Yogyakarta.
Giorno 6: YogyakartaYogyakarta - Prambanan - Borobudur - Yogyakarta (Colazione, Pranzo)
\nPrima colazione. Mattinata dedicata alla visita della città di Yogyakarta. Si visita il Palazzo del Sultano Kraton (chiuso il Lunedì), uno splendido esempio di architettura tradizionale della corte Javanese. Si prosegue con la visita al tempio di Prambanan (main area chiusa il lunedi), tempio Indù e considerato il più elegante tempio di Java. Pranzo in ristorante locale. Nel pomeriggio visitiamo il Tempio Buddista di Borobudur (N chiuso il Lunedì), a circa 40 km da Yogyakarta. La massiccia stupa di pietra di Borobudur è uno dei più grandi monumenti architettonici antichi legata alla tradizione Mahayana. Costruito fra l’anno 750 e 850 dC, Borobudur precede Angkor Wat in Cambogia di tre secoli. Sepolto sotto la cenere vulcanica e la vegetazione tropicale, è stato riscoperto solo nel 1815. Recentemente è stato completamente restaurato da uno sforzo internazionale sotto l'egida dell'UNESCO. È davvero un Mandala, una mappa dell'universo cosmico e della mente umana: un punto di integrazione, unione e connessione; e secondo la filosofia buddista, in pellegrinaggio verso l'alto, raggiungeremo il prezioso \"Nirvana\". Rientro in albergo. Cena libera e pernottamento a Yogyakarta.
\nNota Borobudur: l’accesso fino alla cima del tempo e’ incluso, e’ a numero limitato e puo’ essere negato in qualsiasi momento senza preavviso/rimborso.
Giorno 7: YogyakartaYogyakarta (Colazione, Pranzo)
\nPrima colazione. Questa mattina e’ dedicata alla visita di una zona autentica di Yogyakarta. Passeggiata a piedi nel quartiere di Kota Gede passeggiando tra le case dei locali dove si potrà interagire con loro. Si visita anche una casa locale dove incontreremo una famiglia per apprendere la produzione a mano dei dolci tipici. Si prosegue con la visita del castello dell’acqua (Water Castle) che in passato era il luogo delle vacanze della famiglia reale. Questa visita include una breve passeggiata a bordo dei tradizionali tricicli a pedali chiamati “Becak”.Pranzo in ristorante locale. Nel pomeriggio entriamo in una vera casa di un artigiano locale, un autentico maestro che crea maschere tradizionali giavanesi lavorate a mano che vengono usate negli spettacoli tradizionali. Con il maestro artigiano impareremo quindi i segreti di questa arte centenaria. Dopo di che, rientro in hotel. Cena libera e pernottamento a Yogyakarta.
Giorno 8: Yogyakarta (Colazione)
\nPrima colazione e trasferimento in aeroporto.",
                "hotels": "Categoria Superiore- Ubud Wana Hotel (Camera ROH)
- Harper Malioboro Hotel (Camera ROH)Categoria Deluxe- Plataran Ubud Hotel (Camera ROH)
- Meliá Purosani Hotel (Camera ROH)",
                "included": "Categoria Superiore- Transfer in/out dal aeroporto di Denpasar e nuovo Yogyakarta (YIA), 1.5hrs dal centro città
\n- Pernottamento negli hotel menzionati o similari
\n- I pasti menzionati nell'itinerario (pietanze indonesiane, set menú o buffet)
\n- Tours e trasferimenti in veicoli ​​con aria condizionata
\n- Escursioni con guida locale parlante italiano
\n- Tutti i biglietti di ingressi per le le escursioni indicate nell'itinerario
\n- Assistenza telefonica in lingua italiana 24/7Categoria Deluxe- Transfer in/out dal aeroporto di Denpasar e nuovo Yogyakarta (YIA), 1.5hrs dal centro città
\n- Pernottamento negli hotel menzionati o similari
\n- I pasti menzionati nell'itinerario (pietanze indonesiane, set menú o buffet)
\n- Tours e trasferimenti in veicoli ​​con aria condizionata
\n- Escursioni con guida locale parlante italiano
\n- Tutti i biglietti di ingressi per le le escursioni indicate nell'itinerario
\n- Assistenza telefonica in lingua italiana 24/7",
                "excluded": "Categoria Superiore- Transfer di arrivo/partenza dal vecchio aeroporto di Yogyakarta (JOG)
\n- Costi per il visto (ove necessario)
\n- Voli nazionali e internazionali
\n- Pasti diversi da quelli sopra menzionati
\n- Supplementi per pasti durante feste Nazionali, Pasqua, cena di Natale (24 Dicembre) e Capodanno (31 Dicembre)
\n- Spese per usare fotocamere e/o videocamere ove previsto
\n- Spese personali (bevande, lavanderia, telefono, mance, ecc.)
\n- Assicurazione di viaggio (sempre suggerita)
\n- Mance per autisti e guide
\n- Altri servizi non specificati nella sezione \"Le quote includono\"
\n- Giorno 5: Volo Bali - Yogyakarta (non incluso)Categoria Deluxe- Transfer di arrivo/partenza dal vecchio aeroporto di Yogyakarta (JOG)
\n- Costi per il visto (ove necessario)
\n- Voli nazionali e internazionali
\n- Pasti diversi da quelli sopra menzionati
\n- Supplementi per pasti durante feste Nazionali, Pasqua, cena di Natale (24 Dicembre) e Capodanno (31 Dicembre)
\n- Spese per usare fotocamere e/o videocamere ove previsto
\n- Spese personali (bevande, lavanderia, telefono, mance, ecc.)
\n- Assicurazione di viaggio (sempre suggerita)
\n- Mance per autisti e guide
\n- Altri servizi non specificati nella sezione \"Le quote includono\"
\n- Giorno 5: Volo Bali - Yogyakarta (non incluso)"
            },
            "itinerarySegments": [],
            "itineraryDestinations": [
                {
                    "code": "BAI-22",
                    "destination": "Denpasar",
                    "nights": 0,
                    "description": {},
                    "hotels": "",
                    "hotelsId": []
                },
                {
                    "code": "BAI-6",
                    "destination": "Ubud, Bali",
                    "nights": 4,
                    "description": {},
                    "hotels": "",
                    "hotelsId": []
                },
                {
                    "code": "JOG",
                    "destination": "Yogyakarta",
                    "nights": 3,
                    "description": {},
                    "hotels": "",
                    "hotelsId": []
                }
            ],
            "startDestination": {
                "code": "BAI-22",
                "name": "Denpasar",
                "active": true
            },
            "endDestination": {
                "code": "JOG",
                "name": "Yogyakarta",
                "active": true
            }
        }
    ],
    "images": [
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic1full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic2full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic3full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic4full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic5full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic6full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic7full.jpg",
        "https://d16ci2lruxstkn.cloudfront.net/public/pics/TOUR/0/10144/pic8full.jpg"
    ],
    "languageOptions": [
        "IT"
    ],
    "nights": 7
}
```

With this operation we will obtain the different customisations of the closed tour file by language.

\- **dataSheetId**: With this mandatory parameter we will indicate which closed tour we want his datasheet for.

```
curl --location 'http://default.localhost/resources/static/closedtour/customdatasheet/ADT-10144' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "auditData": {
        "timestamp": "2025-07-28 08:40:41",
        "processTime": 11,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw",
        "traceId": "A7804ED4-C8B5-417F-A6CB-DD0439668BCF",
        "server": "http://localhost:30000"
    },
    "dataSheet": [
        {
            "language": "EN",
            "translation": {
                "name": "Test",
                "description": "Test",
                "hotels": "Test",
                "voucherRemarks": "Test",
                "included": "Test",
                "excluded": "Test",
                "meetingPoint": "Test",
                "remarksTitle": "Test",
                "remarksDescription": "Test"
            }
        },
        {
            "language": "FR",
            "translation": {
                "name": "Test_FR",
                "description": "Test_FR",
                "hotels": "Test_FR",
                "voucherRemarks": "Test_FR",
                "included": "Test_FR",
                "excluded": "Test_FR",
                "meetingPoint": "Test_FR",
                "remarksTitle": "Test_FR",
                "remarksDescription": "Test_FR"
            }
        }
    ],
    "nights": 0
}
```

With this operation we will update custom closed tour data sheet.

\- **dataSheetId**: With this mandatory parameter we will indicate which closed tour we want update datasheet for.

```
curl --location --request PUT 'http://default.localhost/resources/static/closedtour/customdatasheet/ADT-10144' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data '{
  "customDataSheets": [
    {
      "language": "en",
      "translation": {
        "name": "Test_EN",
        "description": "Test_EN",
        "hotels": "Test_EN",
        "voucherRemarks": "Test_EN",
        "included": "Test_EN",
        "excluded": "Test_EN",
        "meetingPoint": "Test_EN",
        "remarksTitle": "Test_EN",
        "remarksDescription": "Test_EN"
      },
      "itinerarySegments": [
        {
          "title": "Test_EN",
          "description": "Test_EN",
          "destination": [
            {
              "type": "DESTINATION",
              "code": "Test_EN",
              "name": "Test_EN",
              "nextLocationDistance": "Test_EN",
              "fromDay": 0,
              "toDay": 0,
              "country": "Test_EN",
              "description": "Test_EN",
              "imageUrls": [
                "Test_EN"
              ],
              "geolocation": {
                "latitude": 0,
                "longitude": 0
              },
              "recommendedAirportCode": "Test_EN",
              "recommendedAirportName": "Test_EN",
              "moreInfoUrl": "Test_EN"
            }
          ],
          "activities": [
            {
              "title": "Test_EN",
              "description": "Test_EN",
              "included": false
            }
          ],
          "hotels": [
            "Test_EN"
          ]
        }
      ],
      "startDestination": {
        "code": "Test_EN",
        "name": "Test_EN",
        "geolocation": {
          "latitude": 0,
          "longitude": 0
        },
        "country": "Test_EN",
        "provincePostalPrefix": "Test_EN",
        "active": true,
        "images": [
          "Test_EN"
        ],
        "description": "Test_EN"
      },
      "endDestination": {
        "code": "Test_EN",
        "name": "Test_EN",
        "geolocation": {
          "latitude": 0,
          "longitude": 0
        },
        "country": "Test_EN",
        "provincePostalPrefix": "Test_EN",
        "active": true,
        "images": [
          "Test_EN"
        ],
        "description": "Test_EN"
      }
    }
  ]
}'
```

```
{
    "auditData": {
        "timestamp": "2025-07-28 08:56:08",
        "processTime": 52,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw",
        "traceId": "A7804ED4-C8B5-417F-A6CB-DD0439668BCF",
        "server": "http://localhost:30000"
    },
    "dataSheet": [
        {
            "language": "EN",
            "translation": {
                "name": "Test_EN",
                "description": "Test_EN",
                "hotels": "Test_EN",
                "voucherRemarks": "Test_EN",
                "included": "Test_EN",
                "excluded": "Test_EN",
                "meetingPoint": "Test_EN",
                "remarksTitle": "Test_EN",
                "remarksDescription": "Test_EN"
            }
        },
        {
            "language": "FR",
            "translation": {
                "name": "Test_FR",
                "description": "Test_FR",
                "hotels": "Test_FR",
                "voucherRemarks": "Test_FR",
                "included": "Test_FR",
                "excluded": "Test_FR",
                "meetingPoint": "Test_FR",
                "remarksTitle": "Test_FR",
                "remarksDescription": "Test_FR"
            }
        }
    ],
    "nights": 0
}
```

With this operation we will delete a custom closed tour data sheet.

\- **lang**: With this mandatory parameter we will indicate which closed tour language we want to delete.

\- **dataSheetId**: With this mandatory parameter we will indicate which closed tour we want to delete.

```
curl --location --request DELETE 'http://default.localhost/resources/static/closedtour/customdatasheet/fr/ADT-10144' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data ''
```

```
{
    "auditData": {
        "timestamp": "2025-07-28 09:38:57",
        "processTime": 28,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1BcGlRQSIsImV4cCI6MTc1MzY5NzczOCwianRpIjoiQTc4MDRFRDQtQzhCNS00MTdGLUE2Q0ItREQwNDM5NjY4QkNGIn0.sC1bHmggBxeVqYj3bTj7g7ChC2Zb_fRNhm3ghuqQoop6D8XqsXSWcHCdF3YaBia_oxKGnbx1JlQMI-DM_yF1Yw",
        "traceId": "A7804ED4-C8B5-417F-A6CB-DD0439668BCF",
        "server": "http://localhost:30000"
    },
    "status": "OK",
    "message": "Custom data sheet deleted successfully"
}
```

This is an optional step needed to create a new reservation just with Closed Tours that needs some mandatory data to quote the Closed Tour. There are just 2 parameters needed:

\- **closedTourID**: Represents the closed tour service identifier.

\- **startDate**: Date on which the closed tour begins

**Pre-Quote Data - Request**

```
curl --location 'http://localhost/resources/booking/closedtour/PKG-31296976-1/prequotedata' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzE0MzQzLCJqdGkiOiI1QzVCMUI4RC0wQTBDLTQyOTEtODQ5Ni02NTAyMjM5NTA5MDAifQ.-lKfNKnBYhvlyzryCCJvgsfbL9mlEbBrDJg6lXUyR3gaSU2XvFJD9i22zstgm_EWfySHC6yp8i2pMCFxHABLcg' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data '{
  "startDate": "2025-03-23"
}'
```

**Pre-Quote closed tour data - Response**

```
{
                                    "auditData": {
                                        "timestamp": "2024-12-04 11:14:05",
                                        "processTime": 15,
                                        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzE0MzQzLCJqdGkiOiI1QzVCMUI4RC0wQTBDLTQyOTEtODQ5Ni02NTAyMjM5NTA5MDAifQ.-lKfNKnBYhvlyzryCCJvgsfbL9mlEbBrDJg6lXUyR3gaSU2XvFJD9i22zstgm_EWfySHC6yp8i2pMCFxHABLcg",
                                        "traceId": "5C5B1B8D-0A0C-4291-8496-650223950900",
                                        "availabilityId": -1,
                                        "server": "http://localhost:30000"
                                    },
                                    "preNights": 0,
                                    "postNights": 0
                                }
```

This is the first step needed to create a new reservation. There are 4 parameters necessary to request the availability or a Closed Tour:

\- **closedTourID**: Represents the closed tour service identifier.

\- **startDate**: Date on which the closed tour begins

\- **language**. language in wich texts wil be returned. (English by default)

\- **distributions**. ages of persons for whom availability is being sought

Depending on the requested parameters, the API will provide you with all the results available for them. Each closed tour will have the modalities available to it. As well as possible additional services associated with the Closed Tour

**Quote closed tour - Request**

Some considerations about the quote:

\- It is important to note that the **auth-token** used in **Quote** calls must be the same throughout the booking flow. The token has an expiration of **120 minutes**, after this time you must start the booking process again from **Quote** with a new token.

\- The **timeout** is represented in milliseconds. Can be used to indicate the maximum waiting time for suppliers to return availability. The total time of the **processTime** request may differ by a few seconds.

```
curl --location 'http://localhost/resources/booking/closedtour/PKG-31296976-1/quote' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjMzMTUzLCJqdGkiOiIxRUVDNzNDNi1DOUY2LTQ1NjItOTMyNy0zN0UxNkEyM0Y5MjUifQ.Cy-87VlCB6cybcf-0Cb9NBabxECDwwxeWsKmyDsxbrAac90qC0dVB8DjO5V1BOoTTj0gerrPE9is-n9GtHnR2w' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data '{
  "startDate": "2025-03-23",
  "language": "en",
  "distributions": [
    {
      "persons": [
        {
          "requestedAge": 30
        },
        {
          "requestedAge": 30
        }
      ]
    }
  ]
}'
```

**Quote closed tour - Response**

Cancellation policies are informational and, depending on connected providers, could not be available at this step. This information is assured in the [Confirm](#confirmclosedtour) step.

\- The content of **tourKey** must be sent from request to request. It will change between requests, so it will need to be refreshed each time.

```
{
                                    "auditData": {
                                        "timestamp": "2024-12-03 12:43:15",
                                        "processTime": 8066,
                                        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjMzMTUzLCJqdGkiOiIxRUVDNzNDNi1DOUY2LTQ1NjItOTMyNy0zN0UxNkEyM0Y5MjUifQ.Cy-87VlCB6cybcf-0Cb9NBabxECDwwxeWsKmyDsxbrAac90qC0dVB8DjO5V1BOoTTj0gerrPE9is-n9GtHnR2w",
                                        "traceId": "1EEC73C6-C9F6-4562-9327-37E16A23F925",
                                        "availabilityId": 590,
                                        "server": "http://localhost:30000"
                                    },
                                    "closedTour": {
                                        "closedTourDataSheet": {
                                            "name": "Journeys: Kenya Safari Experience",
                                            "accommodations": 4,
                                            "nights": 7,
                                            "destinations": "Nairobi,Nakuru,Naivasha,Maasai Mara"
                                        },
                                        "modalities": [
                                            {
                                                "name": "Standard",
                                                "code": "STANDARD",
                                                "netPrice": {
                                                    "amount": 4199.0,
                                                    "currency": "EUR"
                                                },
                                                "onRequest": false,
                                                "cancellationPolicies": [
                                                    {
                                                        "date": "2024-12-03",
                                                        "amount": {
                                                            "amount": 0.0,
                                                            "currency": "EUR"
                                                        }
                                                    },
                                                    {
                                                        "date": "2025-03-23",
                                                        "amount": {
                                                            "amount": 4199.0,
                                                            "currency": "EUR"
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        "additionalServices": [],
                                        "startDate": "2025-03-23 00:00:00",
                                        "selectedNetPrice": {
                                            "amount": 4199.0,
                                            "currency": "EUR"
                                        },
                                        "availabilityId": 590,
                                        "tourKey": "GAD-23745||16448||STANDARD||xruTG",
                                        "accommodationOptions": [],
                                        "transportOptions": []
                                    }
                                }
```

This is an optional step needed to create a new Closed Tours reservation in case that needs to specify the accommodations for any step. There are just 4 parameters needed:

\- **closedTourID**: Represents the closed tour service identifier.

\- **tourKey**: Mandatory parameter for all requests after quote. In that case, needs the received in quote response

\- **accommodationStep**: The index of the step the accommodation belongs to.

\- **accommodationCode**: Accommodation Code received in quote.

**Note**: Additional services may vary depending on the accommodation selected. These, we will receive in this same transaction.

**Get Accommodation Options - Request**

```
curl --location 'http://localhost/resources/booking/closedtour/PKG-31220659-1/accommodation' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1hcGktcHJ1ZWJhcyIsImV4cCI6MTczMzMxNjczMCwianRpIjoiNDFCNTU3OUItMjAzNy00MDM0LUI0RDItN0YzNDREMjc4QzREIn0.Buv2LftmS6RCYq8OzeNGnSutEmSR6OsOi_rJd0hBrcIUdlTnn1SrlKvyH1d5O4VrULLugdmCxRMVwob3Bi2FsA' \
--header 'Content-Type: application/json' \
--header 'Cookie: backend=host.docker.internal:30000' \
--data '{
  "tourKey": "14656||12583||Default||U8C0u",
  "accommodationStep": 0,
  "accommodationCode": "b298f232c6f85297c05e152525924e7f4"
}'
```

**Get Accommodation Options - Response**

```
{
    "auditData": {
        "timestamp": "2024-12-04 11:56:18",
        "processTime": 732,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZXJ0aWZpY2F0aW9uR3JuQ29ubmVjdC1hcGktcHJ1ZWJhcyIsImV4cCI6MTczMzMxNjczMCwianRpIjoiNDFCNTU3OUItMjAzNy00MDM0LUI0RDItN0YzNDREMjc4QzREIn0.Buv2LftmS6RCYq8OzeNGnSutEmSR6OsOi_rJd0hBrcIUdlTnn1SrlKvyH1d5O4VrULLugdmCxRMVwob3Bi2FsA",
        "traceId": "41B5579B-2037-4034-B4D2-7F344D278C4D",
        "availabilityId": -1,
        "server": "http://localhost:30000"
    },
    "additionalServices": [],
    "combinations": [
        {
            "code": "a70ad3a0806acae8a077c54e8ba86036",
            "name": "Ouril Agueda Hotel - Standard - 2 Adultos - APA/BB",
            "room": 1,
            "price": {
                "amount": 2841.5,
                "currency": "EUR"
            },
            "commissionable": {
                "amount": 2841.5,
                "currency": "EUR"
            },
            "cancelPolicies": []
        },
        {
            "code": "c1b8e6e8c059896c48507d561c5f33f4",
            "name": "Ouril Agueda Hotel - Standard - 2 Adultos - MP/HB",
            "room": 1,
            "price": {
                "amount": 3541.5,
                "currency": "EUR"
            },
            "commissionable": {
                "amount": 3541.5,
                "currency": "EUR"
            },
            "cancelPolicies": []
        },
        {
            "code": "10bd8bc298bea2f77d314b9b1d3cf257",
            "name": "Ouril Agueda Hotel - Standard - 2 Adultos - PC/FB",
            "room": 1,
            "price": {
                "amount": 4171.5,
                "currency": "EUR"
            },
            "commissionable": {
                "amount": 4171.5,
                "currency": "EUR"
            },
            "cancelPolicies": []
        }
    ]
}
```

This operation returns the rate confirmation of the selected tour modality and additional services. For this operation, it is also possible to add hotels and transport provided during the [Quote](#quoteclosedtour).  
This means:

\- Confirmation of cancellation policies

\- Returns the required passenger fields for that closed tour. Contact persons refers to the first person of the first distribution. Additional passenger data, refers to possible questions for a especific tour. For example, the preferred language for the tour, possible food intolerances or food allergies.

\- Selected price, that includes the tour price with all selected additional services

```
{
  "modalityCode": "STANDARD",
  "availabilityId": 705,
  "tourKey": "GAD-23745||16448||STANDARD||MjAex",
  "selectedAccommodations": [],
  "selectedTransport": {}
}
```

```
{
    "auditData": {
        "timestamp": "2024-12-03 14:30:54",
        "processTime": 2263,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjM5NzY1LCJqdGkiOiJDREM2MkI3Ni1BNUY0LTQwNEEtQTE2Mi0xQUM5MUY0QkU0MDIifQ.hDMHTEynUbPKascfb3SU3KUiSECYQDr7ccreDpUmTBc_mMfQwmQMdN6ARUb7Ya2UC2CEsW4wPZCVtkgcsdV3Bg",
        "traceId": "CDC62B76-A5F4-404A-A162-1AC91F4BE402",
        "availabilityId": 705,
        "server": "http://localhost:30000"
    },
    "requiredPassengerData": {
        "contactPerson": [
            "COUNTRY",
            "DOCUMENT",
            "TITLE",
            "EMAIL",
            "LAST_NAME",
            "FIRST_NAME"
        ],
        "otherPersons": [
            "COUNTRY",
            "DOCUMENT",
            "TITLE",
            "EMAIL",
            "LAST_NAME",
            "PASSPORT",
            "DOCUMENT_EXPIRY_DATE",
            "FIRST_NAME"
        ],
        "additionalRequiredData": []
    },
    "tourKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0aWVzIjpbeyJuYW1lIjoiU3RhbmRhcmQiLCJjb2RlIjoiU1RBTkRBUkQiLCJuZXRQcmljZSI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifSwib25SZXF1ZXN0IjpmYWxzZSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEyLTAzIiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTAzLTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6NDE5OS4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImluZm9ybWF0aW9uUHJvdmlkZXIiOiIifV0sImFkZGl0aW9uYWxTZXJ2aWNlcyI6W10sInRvdXJJZCI6IkdBRC0yMzc0NSIsInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoiMTY0NDgiLCJtb2RhbGl0eUNvZGUiOiJTVEFOREFSRCIsImRpc3RyaWJ1dGlvbnMiOlt7InBlcnNvbiI6W3sicmVxdWVzdGVkQWdlIjozMH0seyJyZXF1ZXN0ZWRBZ2UiOjMwfV19XSwicmVxdWlyZWRGaWVsZENvbnRhY3QiOlsiQ09VTlRSWSIsIkRPQ1VNRU5UIiwiVElUTEUiLCJFTUFJTCIsIkxBU1RfTkFNRSIsIkZJUlNUX05BTUUiXSwicmVxdWlyZWRGaWVsZE90aGVycyI6WyJDT1VOVFJZIiwiRE9DVU1FTlQiLCJUSVRMRSIsIkVNQUlMIiwiTEFTVF9OQU1FIiwiUEFTU1BPUlQiLCJET0NVTUVOVF9FWFBJUllfREFURSIsIkZJUlNUX05BTUUiXSwiY2hlY2tPdXQiOlsyMDI1LDMsMzBdLCJleHRyYUNvZGUiOiIxMjczODYzIiwic2VsZWN0ZWRNb2RhbGl0eSI6eyJuYW1lIjoiU3RhbmRhcmQiLCJjb2RlIjoiU1RBTkRBUkQiLCJuZXRQcmljZSI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifSwib25SZXF1ZXN0IjpmYWxzZSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEyLTAzIiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTAzLTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6NDE5OS4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImluZm9ybWF0aW9uUHJvdmlkZXIiOiIifSwicHJlTmlnaHRzIjowLCJwb3N0TmlnaHRzIjowLCJhY2NvbW1vZGF0aW9uT3B0aW9ucyI6W10sInNlbGVjdGVkQWNjb21tb2RhdGlvbnMiOltdLCJ0cmFuc3BvcnRPcHRpb25zIjpbXSwiZnJvbUNvbnRyYWN0IjpmYWxzZSwic3RhcnREYXRlIjpbMjAyNSwzLDIzXX0.TmcxMi-Ykf2I8mkknTcuO_Yc3l9FyOtcaiSfRgYE0hQ",
    "warnings": [],
    "selectedPrice": {
        "amount": 4199.0,
        "currency": "EUR"
    },
    "remarks": "Customer Information: "
}
```

This operation creates a pre-reservation of the selected modality. Some considerations:

\- The required data of the required guests, indicated in the response of the [Confirm](#confirmclosedtour) operation, must be sent.

\- The distribution sent must match the one requested in the calls of [Quote Closed Tour](#quoteclosedtour) as well as the **requestedAge** of each guest.

\- The **requestedAge** must be the passenger's age at the end of the stay.

\- Prebook step is an extra call to the provider to validate that all the information received on the Confirm is correct.

\- This call allows to confirm that all the data received to be booked is correct: price, cancelation policies… and we strongly recommend double check this data before the book step

\- Phone Country Code: Some suppliers requested us send them a valid telephone number, so it is necessary and mandatory send the valid code. The format will be always “+” and the code number. It is not allowed to use the “00”.

```
{
    "additionalPassengerData": [ ],
    "additionalServicesCodes": [ ],
      "availabilityId": 770,
    "distributions": [
        {
            "person": [
                {
                    "birthDate": "1990-09-24",
                    "country": "Spain",
                    "countryId": "ES",
                    "courtesyTitle": "MISTER",
                    "documentNumber": "12345678Z",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "lastName": "last Name",
                    "name": "Name",
                    "passportExpirationDate": "2027-09-24",
                    "phone": "666999666",
                    "phoneCountryCode": "+34",
                    "requestedAge": 30
                },
                {
                    "birthDate": "1990-09-24",
                    "country": "Spain",
                    "countryId": "ES",
                    "courtesyTitle": "MISTER",
                    "documentNumber": "98765432M",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "lastName": "last Name 2",
                    "name": "pepe",
                    "passportExpirationDate": "2027-09-24",
                    "phone": "666555444",
                    "phoneCountryCode": "+34",
                    "requestedAge": 30
                }

            ]
        }
    ],
    "tourKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0aWVzIjpbeyJuYW1lIjoiU3RhbmRhcmQiLCJjb2RlIjoiU1RBTkRBUkQiLCJuZXRQcmljZSI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifSwib25SZXF1ZXN0IjpmYWxzZSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEyLTAzIiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTAzLTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6NDE5OS4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImluZm9ybWF0aW9uUHJvdmlkZXIiOiIifV0sImFkZGl0aW9uYWxTZXJ2aWNlcyI6W10sInRvdXJJZCI6IkdBRC0yMzc0NSIsInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoiMTY0NDgiLCJtb2RhbGl0eUNvZGUiOiJTVEFOREFSRCIsImRpc3RyaWJ1dGlvbnMiOlt7InBlcnNvbiI6W3sicmVxdWVzdGVkQWdlIjozMH0seyJyZXF1ZXN0ZWRBZ2UiOjMwfV19XSwicmVxdWlyZWRGaWVsZENvbnRhY3QiOlsiQ09VTlRSWSIsIkRPQ1VNRU5UIiwiVElUTEUiLCJFTUFJTCIsIkxBU1RfTkFNRSIsIkZJUlNUX05BTUUiXSwicmVxdWlyZWRGaWVsZE90aGVycyI6WyJDT1VOVFJZIiwiRE9DVU1FTlQiLCJUSVRMRSIsIkVNQUlMIiwiTEFTVF9OQU1FIiwiUEFTU1BPUlQiLCJET0NVTUVOVF9FWFBJUllfREFURSIsIkZJUlNUX05BTUUiXSwiY2hlY2tPdXQiOlsyMDI1LDMsMzBdLCJleHRyYUNvZGUiOiIxMjczODYzIiwic2VsZWN0ZWRNb2RhbGl0eSI6eyJuYW1lIjoiU3RhbmRhcmQiLCJjb2RlIjoiU1RBTkRBUkQiLCJuZXRQcmljZSI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifSwib25SZXF1ZXN0IjpmYWxzZSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEyLTAzIiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTAzLTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6NDE5OS4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImluZm9ybWF0aW9uUHJvdmlkZXIiOiIifSwicHJlTmlnaHRzIjowLCJwb3N0TmlnaHRzIjowLCJhY2NvbW1vZGF0aW9uT3B0aW9ucyI6W10sInNlbGVjdGVkQWNjb21tb2RhdGlvbnMiOltdLCJ0cmFuc3BvcnRPcHRpb25zIjpbXSwiZnJvbUNvbnRyYWN0IjpmYWxzZSwic3RhcnREYXRlIjpbMjAyNSwzLDIzXX0.TmcxMi-Ykf2I8mkknTcuO_Yc3l9FyOtcaiSfRgYE0hQ"
}
```

```
{
    "auditData": {
        "timestamp": "2024-12-03 14:33:25",
        "processTime": 7304,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjM5NzY1LCJqdGkiOiJDREM2MkI3Ni1BNUY0LTQwNEEtQTE2Mi0xQUM5MUY0QkU0MDIifQ.hDMHTEynUbPKascfb3SU3KUiSECYQDr7ccreDpUmTBc_mMfQwmQMdN6ARUb7Ya2UC2CEsW4wPZCVtkgcsdV3Bg",
        "traceId": "CDC62B76-A5F4-404A-A162-1AC91F4BE402",
        "availabilityId": 770,
        "server": "http://localhost:30000"
    },
    "warnings": [],
    "tourKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0aWVzIjpbeyJuYW1lIjoiU3RhbmRhcmQiLCJjb2RlIjoiU1RBTkRBUkQiLCJuZXRQcmljZSI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifSwib25SZXF1ZXN0IjpmYWxzZSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEyLTAzIiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTAzLTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6NDE5OS4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImluZm9ybWF0aW9uUHJvdmlkZXIiOiIifV0sImFkZGl0aW9uYWxTZXJ2aWNlcyI6W10sInRvdXJJZCI6IkdBRC0yMzc0NSIsInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoiMTY0NDgiLCJtb2RhbGl0eUNvZGUiOiJTVEFOREFSRCIsImRpc3RyaWJ1dGlvbnMiOlt7InBlcnNvbiI6W3sibmFtZSI6Ik5hbWUiLCJsYXN0TmFtZSI6Imxhc3QgTmFtZSIsInJlcXVlc3RlZEFnZSI6MzAsImJpcnRoRGF0ZSI6IjE5OTAtMDktMjQiLCJkb2N1bWVudE51bWJlciI6IjEyMzQ1Njc4WiIsImNvdXJ0ZXN5VGl0bGUiOiJNSVNURVIiLCJkb2N1bWVudFR5cGUiOiJQQVNTUE9SVCIsImVtYWlsIjoibWFpbEBlbWFpbC5jb20iLCJwaG9uZUNvdW50cnlDb2RlIjoiKzM0IiwicGhvbmUiOiI2NjY5OTk2NjYiLCJjb3VudHJ5IjoiU3BhaW4iLCJjb3VudHJ5SWQiOiJFUyIsInBhc3Nwb3J0RXhwaXJhdGlvbkRhdGUiOiIyMDI3LTA5LTI0IiwiY2x1YkRvY3VtZW50TnVtYmVyIjoiNTQ1OTA2NCJ9LHsibmFtZSI6InBlcGUiLCJsYXN0TmFtZSI6Imxhc3QgTmFtZSAyIiwicmVxdWVzdGVkQWdlIjozMCwiYmlydGhEYXRlIjoiMTk5MC0wOS0yNCIsImRvY3VtZW50TnVtYmVyIjoiOTg3NjU0MzJNIiwiY291cnRlc3lUaXRsZSI6Ik1JU1RFUiIsImRvY3VtZW50VHlwZSI6IlBBU1NQT1JUIiwiZW1haWwiOiJtYWlsQGVtYWlsLmNvbSIsInBob25lQ291bnRyeUNvZGUiOiIrMzQiLCJwaG9uZSI6IjY2NjU1NTQ0NCIsImNvdW50cnkiOiJTcGFpbiIsImNvdW50cnlJZCI6IkVTIiwicGFzc3BvcnRFeHBpcmF0aW9uRGF0ZSI6IjIwMjctMDktMjQiLCJjbHViRG9jdW1lbnROdW1iZXIiOiI1NDU5MDY1In1dfV0sInJlcXVpcmVkRmllbGRDb250YWN0IjpbIkNPVU5UUlkiLCJET0NVTUVOVCIsIlRJVExFIiwiRU1BSUwiLCJMQVNUX05BTUUiLCJGSVJTVF9OQU1FIl0sInJlcXVpcmVkRmllbGRPdGhlcnMiOlsiQ09VTlRSWSIsIkRPQ1VNRU5UIiwiVElUTEUiLCJFTUFJTCIsIkxBU1RfTkFNRSIsIlBBU1NQT1JUIiwiRE9DVU1FTlRfRVhQSVJZX0RBVEUiLCJGSVJTVF9OQU1FIl0sImNoZWNrT3V0IjpbMjAyNSwzLDMwXSwiZXh0cmFDb2RlIjoiMTI3Mzg2MyIsInNlbGVjdGVkTW9kYWxpdHkiOnsibmFtZSI6IlN0YW5kYXJkIiwiY29kZSI6IlNUQU5EQVJEIiwibmV0UHJpY2UiOnsiYW1vdW50Ijo0MTk5LjAsImN1cnJlbmN5IjoiRVVSIn0sIm9uUmVxdWVzdCI6ZmFsc2UsImNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNC0xMi0wMyIsImFtb3VudCI6eyJhbW91bnQiOjAuMCwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wMy0yMyIsImFtb3VudCI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifX1dLCJpbmZvcm1hdGlvblByb3ZpZGVyIjoiIn0sInByZU5pZ2h0cyI6MCwicG9zdE5pZ2h0cyI6MCwiYWNjb21tb2RhdGlvbk9wdGlvbnMiOltdLCJzZWxlY3RlZEFjY29tbW9kYXRpb25zIjpbXSwidHJhbnNwb3J0T3B0aW9ucyI6W10sImZyb21Db250cmFjdCI6ZmFsc2UsInN0YXJ0RGF0ZSI6WzIwMjUsMywyM119.YHcsldukew7Q5_Tjkon07FXRle14FtYOqU9fvw5fpWE",
    "selectedPrice": {
        "amount": 4199.0,
        "currency": "EUR"
    },
    "availabilityId": 770
}
```

This operation creates a reservation of the rate of the selected combination. Some considerations:

\- The **fakeBooking** attribute is optional. If not sent, the reservation will be closed as BOOKED in the test environment or with the actual state returned by the vendor in the production environment. This attribute is useful if you want to simulate an error, in which case you can send BOOK\_ERROR. Keep in mind that with the **fakeBooking** attribute the reservation will not be persisted in the Travelcompositor system or sent to suppliers if it is in a production environment.

\- The **externalReference** attribute is optional. It can be used to save the customer's reference and thus link it to the generated reservation.

```
{
  "tourKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0aWVzIjpbeyJuYW1lIjoiU3RhbmRhcmQiLCJjb2RlIjoiU1RBTkRBUkQiLCJuZXRQcmljZSI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifSwib25SZXF1ZXN0IjpmYWxzZSwiY2FuY2VsbGF0aW9uUG9saWNpZXMiOlt7ImRhdGUiOiIyMDI0LTEyLTAzIiwiYW1vdW50Ijp7ImFtb3VudCI6MC4wLCJjdXJyZW5jeSI6IkVVUiJ9fSx7ImRhdGUiOiIyMDI1LTAzLTIzIiwiYW1vdW50Ijp7ImFtb3VudCI6NDE5OS4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sImluZm9ybWF0aW9uUHJvdmlkZXIiOiIifV0sImFkZGl0aW9uYWxTZXJ2aWNlcyI6W10sInRvdXJJZCI6IkdBRC0yMzc0NSIsInByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjoiMTY0NDgiLCJtb2RhbGl0eUNvZGUiOiJTVEFOREFSRCIsImRpc3RyaWJ1dGlvbnMiOlt7InBlcnNvbiI6W3sibmFtZSI6Ik5hbWUiLCJsYXN0TmFtZSI6Imxhc3QgTmFtZSIsInJlcXVlc3RlZEFnZSI6MzAsImJpcnRoRGF0ZSI6IjE5OTAtMDktMjQiLCJkb2N1bWVudE51bWJlciI6IjEyMzQ1Njc4WiIsImNvdXJ0ZXN5VGl0bGUiOiJNSVNURVIiLCJkb2N1bWVudFR5cGUiOiJQQVNTUE9SVCIsImVtYWlsIjoibWFpbEBlbWFpbC5jb20iLCJwaG9uZUNvdW50cnlDb2RlIjoiKzM0IiwicGhvbmUiOiI2NjY5OTk2NjYiLCJjb3VudHJ5IjoiU3BhaW4iLCJjb3VudHJ5SWQiOiJFUyIsInBhc3Nwb3J0RXhwaXJhdGlvbkRhdGUiOiIyMDI3LTA5LTI0IiwiY2x1YkRvY3VtZW50TnVtYmVyIjoiNTQ1OTA2NCJ9LHsibmFtZSI6InBlcGUiLCJsYXN0TmFtZSI6Imxhc3QgTmFtZSAyIiwicmVxdWVzdGVkQWdlIjozMCwiYmlydGhEYXRlIjoiMTk5MC0wOS0yNCIsImRvY3VtZW50TnVtYmVyIjoiOTg3NjU0MzJNIiwiY291cnRlc3lUaXRsZSI6Ik1JU1RFUiIsImRvY3VtZW50VHlwZSI6IlBBU1NQT1JUIiwiZW1haWwiOiJtYWlsQGVtYWlsLmNvbSIsInBob25lQ291bnRyeUNvZGUiOiIrMzQiLCJwaG9uZSI6IjY2NjU1NTQ0NCIsImNvdW50cnkiOiJTcGFpbiIsImNvdW50cnlJZCI6IkVTIiwicGFzc3BvcnRFeHBpcmF0aW9uRGF0ZSI6IjIwMjctMDktMjQiLCJjbHViRG9jdW1lbnROdW1iZXIiOiI1NDU5MDY1In1dfV0sInJlcXVpcmVkRmllbGRDb250YWN0IjpbIkNPVU5UUlkiLCJET0NVTUVOVCIsIlRJVExFIiwiRU1BSUwiLCJMQVNUX05BTUUiLCJGSVJTVF9OQU1FIl0sInJlcXVpcmVkRmllbGRPdGhlcnMiOlsiQ09VTlRSWSIsIkRPQ1VNRU5UIiwiVElUTEUiLCJFTUFJTCIsIkxBU1RfTkFNRSIsIlBBU1NQT1JUIiwiRE9DVU1FTlRfRVhQSVJZX0RBVEUiLCJGSVJTVF9OQU1FIl0sImNoZWNrT3V0IjpbMjAyNSwzLDMwXSwiZXh0cmFDb2RlIjoiMTI3Mzg2MyIsInNlbGVjdGVkTW9kYWxpdHkiOnsibmFtZSI6IlN0YW5kYXJkIiwiY29kZSI6IlNUQU5EQVJEIiwibmV0UHJpY2UiOnsiYW1vdW50Ijo0MTk5LjAsImN1cnJlbmN5IjoiRVVSIn0sIm9uUmVxdWVzdCI6ZmFsc2UsImNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNC0xMi0wMyIsImFtb3VudCI6eyJhbW91bnQiOjAuMCwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wMy0yMyIsImFtb3VudCI6eyJhbW91bnQiOjQxOTkuMCwiY3VycmVuY3kiOiJFVVIifX1dLCJpbmZvcm1hdGlvblByb3ZpZGVyIjoiIn0sInByZU5pZ2h0cyI6MCwicG9zdE5pZ2h0cyI6MCwiYWNjb21tb2RhdGlvbk9wdGlvbnMiOltdLCJzZWxlY3RlZEFjY29tbW9kYXRpb25zIjpbXSwidHJhbnNwb3J0T3B0aW9ucyI6W10sImZyb21Db250cmFjdCI6ZmFsc2UsInN0YXJ0RGF0ZSI6WzIwMjUsMywyM119.YHcsldukew7Q5_Tjkon07FXRle14FtYOqU9fvw5fpWE",
  "additionalServicesCodes": [],
  "additionalPassengerData": [],
  "externalReference": "Fake-Reference"
}
```

```
{
                                        "auditData": {
                                            "timestamp": "2024-12-03 14:35:18",
                                            "processTime": 15034,
                                            "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMjM5NzY1LCJqdGkiOiJDREM2MkI3Ni1BNUY0LTQwNEEtQTE2Mi0xQUM5MUY0QkU0MDIifQ.hDMHTEynUbPKascfb3SU3KUiSECYQDr7ccreDpUmTBc_mMfQwmQMdN6ARUb7Ya2UC2CEsW4wPZCVtkgcsdV3Bg",
                                            "traceId": "CDC62B76-A5F4-404A-A162-1AC91F4BE402",
                                            "availabilityId": -1,
                                            "server": "http://localhost:30000"
                                        },
                                        "bookingReference": "TRC-24199",
                                        "externalReference": "Fake-Reference",
                                        "status": "BOOKED",
                                        "distributions": [
                                            {
                                                "id": "TRC-24199-0",
                                                "person": [
                                                    {
                                                        "id": "TRC-24199-0-0",
                                                        "name": "Name",
                                                        "lastName": "last Name",
                                                        "requestedAge": 30,
                                                        "birthDate": "1990-09-24",
                                                        "documentNumber": "12345678Z",
                                                        "courtesyTitle": "MISTER",
                                                        "documentType": "PASSPORT",
                                                        "email": "mail@email.com",
                                                        "phoneCountryCode": "+34",
                                                        "phone": "666999666",
                                                        "country": "Spain",
                                                        "countryId": "ES",
                                                        "passportExpirationDate": "2027-09-24",
                                                        "clubDocumentNumber": "5459064"
                                                    },
                                                    {
                                                        "id": "TRC-24199-0-1",
                                                        "name": "pepe",
                                                        "lastName": "last Name 2",
                                                        "requestedAge": 30,
                                                        "birthDate": "1990-09-24",
                                                        "documentNumber": "98765432M",
                                                        "courtesyTitle": "MISTER",
                                                        "documentType": "PASSPORT",
                                                        "email": "mail@email.com",
                                                        "phoneCountryCode": "+34",
                                                        "phone": "666555444",
                                                        "country": "Spain",
                                                        "countryId": "ES",
                                                        "passportExpirationDate": "2027-09-24",
                                                        "clubDocumentNumber": "5459065"
                                                    }
                                                ]
                                            }
                                        ],
                                        "closedTour": {
                                            "startDestination": "Nairobi",
                                            "startDate": "2025-03-23 00:00:00",
                                            "name": "Journeys: Kenya Safari Experience",
                                            "itineraryDestinations": "Nairobi, Nakuru, Naivasha, Maasai Mara",
                                            "modality": {
                                                "name": "Standard",
                                                "code": "STANDARD",
                                                "netPrice": {
                                                    "amount": 4199.0,
                                                    "currency": "EUR"
                                                },
                                                "onRequest": false,
                                                "cancellationPolicies": []
                                            },
                                            "additionalServices": [],
                                            "bookingReference": "2221983",
                                            "status": "BOOKED"
                                        }
                                    }
```

This operation allows you to recover the cancellation fees of a closed tour reservation on the day and time that the query is made. To cancel the reservation you should use the [Cancel](#closedtourcancel) operation.

```
curl --location 'http://localhost/resources/booking/TRC-24200/closedtour/2222010/cancellation-fee' \
--header 'accept: application/json' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI0MDQzLCJqdGkiOiI3M0U5NTdBMi1DMkE0LTQ1RTUtQTNDMi1FQjU2MTdERkMyNUQifQ.W9YotA_pT0kkOeY6WjMlhLz8Q2LBwU69sIDw6cFqM_Yfui8yH8AO-02u5OqjALNc-vHiUFnMxv38YZNaUrlywQ' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "auditData": {
        "timestamp": "2024-12-04 13:59:33",
        "processTime": 69,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI0MDQzLCJqdGkiOiI3M0U5NTdBMi1DMkE0LTQ1RTUtQTNDMi1FQjU2MTdERkMyNUQifQ.W9YotA_pT0kkOeY6WjMlhLz8Q2LBwU69sIDw6cFqM_Yfui8yH8AO-02u5OqjALNc-vHiUFnMxv38YZNaUrlywQ",
        "traceId": "73E957A2-C2A4-45E5-A3C2-EB5617DFC25D",
        "availabilityId": -1,
        "server": "http://localhost:30000"
    },
    "cancellationFee": {
        "amount": 150.0,
        "currency": "EUR"
    }
}
}
```

This operation allows the cancellation of a closed tour reservation. To recover cancellation fees you can use the [Cancellation fees](#closedtourcancellationfees) operation.

```
curl --location --request DELETE 'http://localhost/resources/booking/TRC-24200/closedtour/2222010' \
--header 'accept: application/json' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI1MDEzLCJqdGkiOiI4MzhGNjA5Ri0xOTFGLTRDRTEtQUIzOS0zRDg1Mjc3QjdBMzgifQ.sw99kE51Um57vNkKmisgU36-CyVsxay95k-W23f99ohxvaXer7EppmoETtl6ZnAYukjCqFDDg6583gg_VYZ0iw' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "auditData": {
        "timestamp": "2024-12-04 14:10:50",
        "processTime": 21546,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI1MDEzLCJqdGkiOiI4MzhGNjA5Ri0xOTFGLTRDRTEtQUIzOS0zRDg1Mjc3QjdBMzgifQ.sw99kE51Um57vNkKmisgU36-CyVsxay95k-W23f99ohxvaXer7EppmoETtl6ZnAYukjCqFDDg6583gg_VYZ0iw",
        "traceId": "73E957A2-C2A4-45E5-A3C2-EB5617DFC25D",
        "availabilityId": -1,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-24200",
    "externalReference": "Fake-Reference",
    "status": "CANCELED",
    "distributions": [
        {
            "id": "TRC-24200-0",
            "person": [
                {
                    "id": "TRC-24200-0-0",
                    "name": "Name",
                    "lastName": "last Name",
                    "requestedAge": 30,
                    "birthDate": "1990-09-24",
                    "documentNumber": "12345678Z",
                    "courtesyTitle": "MISTER",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "phoneCountryCode": "+34",
                    "phone": "666999666",
                    "country": "Spain",
                    "countryId": "ES",
                    "passportExpirationDate": "2027-09-24",
                    "clubDocumentNumber": "5459064"
                },
                {
                    "id": "TRC-24200-0-1",
                    "name": "pepe",
                    "lastName": "last Name 2",
                    "requestedAge": 30,
                    "birthDate": "1990-09-24",
                    "documentNumber": "98765432M",
                    "courtesyTitle": "MISTER",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "phoneCountryCode": "+34",
                    "phone": "666555444",
                    "country": "Spain",
                    "countryId": "ES",
                    "passportExpirationDate": "2027-09-24",
                    "clubDocumentNumber": "5459065"
                }
            ]
        }
    ],
    "closedTour": {
        "startDestination": "Nairobi",
        "startDate": "2025-03-23 00:00:00",
        "name": "Journeys: Kenya Safari Experience",
        "itineraryDestinations": "Nairobi, Nakuru, Naivasha, Maasai Mara",
        "modality": {
            "name": "Standard",
            "code": "STANDARD",
            "netPrice": {
                "amount": 4199.0,
                "currency": "EUR"
            },
            "onRequest": false,
            "cancellationPolicies": []
        },
        "additionalServices": [],
        "bookingReference": "2222010",
        "status": "CANCELED"
    }
}
```

This operation allows you to update the reservation with the latest information that the reservation provider has. An example of use would be: if a closed tour reservation has been closed with status 'On Request', you can use this operation to check if the status has been updated.

```
curl --location --request PUT 'http://localhost/resources/booking/TRC-24201/closedtour/2222014' \
--header 'accept: application/json' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI1MDEzLCJqdGkiOiI4MzhGNjA5Ri0xOTFGLTRDRTEtQUIzOS0zRDg1Mjc3QjdBMzgifQ.sw99kE51Um57vNkKmisgU36-CyVsxay95k-W23f99ohxvaXer7EppmoETtl6ZnAYukjCqFDDg6583gg_VYZ0iw' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "auditData": {
        "timestamp": "2024-12-04 14:33:38",
        "processTime": 4434,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI1MDEzLCJqdGkiOiI4MzhGNjA5Ri0xOTFGLTRDRTEtQUIzOS0zRDg1Mjc3QjdBMzgifQ.sw99kE51Um57vNkKmisgU36-CyVsxay95k-W23f99ohxvaXer7EppmoETtl6ZnAYukjCqFDDg6583gg_VYZ0iw",
        "traceId": "838F609F-191F-4CE1-AB39-3D85277B7A38",
        "availabilityId": -1,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-24201",
    "externalReference": "Fake-Reference",
    "status": "RQ",
    "distributions": [
        {
            "id": "TRC-24201-0",
            "person": [
                {
                    "id": "TRC-24201-0-0",
                    "name": "Name",
                    "lastName": "last Name",
                    "requestedAge": 30,
                    "birthDate": "1990-09-24",
                    "documentNumber": "12345678Z",
                    "courtesyTitle": "MISTER",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "phoneCountryCode": "+34",
                    "phone": "666999666",
                    "country": "Spain",
                    "countryId": "ES",
                    "passportExpirationDate": "2027-09-24",
                    "clubDocumentNumber": "5459064"
                },
                {
                    "id": "TRC-24201-0-1",
                    "name": "pepe",
                    "lastName": "last Name 2",
                    "requestedAge": 30,
                    "birthDate": "1990-09-24",
                    "documentNumber": "98765432M",
                    "courtesyTitle": "MISTER",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "phoneCountryCode": "+34",
                    "phone": "666555444",
                    "country": "Spain",
                    "countryId": "ES",
                    "passportExpirationDate": "2027-09-24",
                    "clubDocumentNumber": "5459065"
                }
            ]
        }
    ],
    "closedTour": {
        "startDestination": "Nairobi",
        "startDate": "2025-03-23 00:00:00",
        "name": "Journeys: Kenya Safari Experience",
        "itineraryDestinations": "Nairobi, Nakuru, Naivasha, Maasai Mara",
        "modality": {
            "name": "Standard",
            "code": "STANDARD",
            "netPrice": {
                "amount": 4199.0,
                "currency": "EUR"
            },
            "onRequest": false,
            "cancellationPolicies": []
        },
        "additionalServices": [],
        "bookingReference": "2222014",
        "status": "RQ"
    }
}
```

This operation allows you to retrieve the details of a reservation from the **bookingReference** of the reservation and the **bookingReference** of the property. This operation does not make any calls to the closed tours providers and only retrieves the data that is in Travel Compositor.

```
curl --location 'http://localhost/resources/booking/TRC-24201/closedtour/2222014' \
--header 'accept: application/json' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI1MDEzLCJqdGkiOiI4MzhGNjA5Ri0xOTFGLTRDRTEtQUIzOS0zRDg1Mjc3QjdBMzgifQ.sw99kE51Um57vNkKmisgU36-CyVsxay95k-W23f99ohxvaXer7EppmoETtl6ZnAYukjCqFDDg6583gg_VYZ0iw' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "auditData": {
        "timestamp": "2024-12-04 14:39:47",
        "processTime": 27,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaS1wcnVlYmFzIiwiZXhwIjoxNzMzMzI1MDEzLCJqdGkiOiI4MzhGNjA5Ri0xOTFGLTRDRTEtQUIzOS0zRDg1Mjc3QjdBMzgifQ.sw99kE51Um57vNkKmisgU36-CyVsxay95k-W23f99ohxvaXer7EppmoETtl6ZnAYukjCqFDDg6583gg_VYZ0iw",
        "traceId": "838F609F-191F-4CE1-AB39-3D85277B7A38",
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-24201",
    "externalReference": "Fake-Reference",
    "status": "RQ",
    "distributions": [
        {
            "id": "TRC-24201-0",
            "person": [
                {
                    "id": "TRC-24201-0-0",
                    "name": "Name",
                    "lastName": "last Name",
                    "requestedAge": 30,
                    "birthDate": "1990-09-24",
                    "documentNumber": "12345678Z",
                    "courtesyTitle": "MISTER",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "phoneCountryCode": "+34",
                    "phone": "666999666",
                    "country": "Spain",
                    "countryId": "ES",
                    "passportExpirationDate": "2027-09-24",
                    "clubDocumentNumber": "5459064"
                },
                {
                    "id": "TRC-24201-0-1",
                    "name": "pepe",
                    "lastName": "last Name 2",
                    "requestedAge": 30,
                    "birthDate": "1990-09-24",
                    "documentNumber": "98765432M",
                    "courtesyTitle": "MISTER",
                    "documentType": "PASSPORT",
                    "email": "mail@email.com",
                    "phoneCountryCode": "+34",
                    "phone": "666555444",
                    "country": "Spain",
                    "countryId": "ES",
                    "passportExpirationDate": "2027-09-24",
                    "clubDocumentNumber": "5459065"
                }
            ]
        }
    ],
    "closedTour": {
        "startDestination": "Nairobi",
        "startDate": "2025-03-23 00:00:00",
        "name": "Journeys: Kenya Safari Experience",
        "itineraryDestinations": "Nairobi, Nakuru, Naivasha, Maasai Mara",
        "modality": {
            "name": "Standard",
            "code": "STANDARD",
            "netPrice": {
                "amount": 4199.0,
                "currency": "EUR"
            },
            "onRequest": false,
            "cancellationPolicies": []
        },
        "additionalServices": [],
        "bookingReference": "2222014",
        "status": "RQ"
    }
}
```

## 1 - Do you support Multi-Nationality or not?

Yes.

## 2\. Do you support push rate?

No.

## 3\. What\`s the transport data format (XML / JSON)?

Only JSON.

## 4\. Does it support gzip?

Yes, is mandatory.

## 5\. Can the interface transmit bedding type information?

No.

## 6\. Is there any limit on the Max Occupancy?

15 travellers.

## 7\. Do you support children or not? Age range?

Yes, it is supported. Children's age range goes from 0 till 17 years old (inclusive).

## 8\. Is there any limit on the Max No. of Adults?

15 Adults. 6 per Room as max. occupancy.

## 9\. Is there any limit on the Max No. of Children?

14 Children. 5 per Room. One adult mandatory.

## 10\. Do you support Multi-Room Booking or not?

Yes.

## 11\. Whats is the Maximum Room No. per booking?

4 rooms as maximum.

## 12\. Do you support different Occupancy per room?

Yes.

## 13\. Do you support multi-currency or not?

No.

## 14\. Do you support Guest Name for Each Room or not?

No. We can receive the names of all passengers but we only pass on the mandatory information to the suppliers.

## 15\. In the pre book step,will you provide cache rate or real rate?

Depends on connected providers. We are a supplier hub.

## 16\. Do you support special request or not? Free Text or structured?

No.

## 17\. Is it posible to specify in the request if 2 adults go in one room and 1 adult and 1 child in another for example? What is the maximum number of passengers / rooms that they support?

As explained on other questions, you can indicate how many people go in each distribution. In the request, you can indicate **“N”** number of distributions (up to 4 maximum) and in each distribution there are **“N”** people to be included(up to 6 maximum). Each distribution is equivalent to one room. The total number of passengers in a reservation is 15.

```
"distributions": [
        {
            "persons": [
                {
                    "requestedAge": 30
                },
                {
                    "requestedAge": 30
                }
            ]
        },{
            "persons": [
                {
                    "requestedAge": 30
                },
                {
                    "requestedAge": 5
                }
            ]
        }
    ]
```

## 18\. Can we specify the currency in which we want the results in the availability request? If not, is it possible that we have different currencies in the different combinations?

No, always will be returned the currency whih is set up at microsite configuration and always will be the same.

## 19\. Which is the certification process to follow?

We will ask you for the request and response of all the calls to verify that the calls are being made correctly. It shouldn't take more than a few days. Ideally, if it were possible to have a staging site to test the flow, that would be great, but it's not required.

We will also request:

\- **A booking with a single room (2 Adults)**

\- **A booking with 2 rooms**

\- **A booking with adults and children**

\- **A booking with adults with pre-nights**

\- **A booking with adults with post-nights**

\- **A booking with adults with pre-nights and post-nights**

\- **A booking with adults with flights**

\- **A booking with adults with additinal services**

\- **A booking with adults with selectable hotels**

## 20\. Which booking statuses can be found in your system?

Our system handles statuses at two levels: **booking status** and **service status**. The booking status is calculated from the statuses of the services included in the booking.

**Service statuses:**  
\- **BOOKED** - Service confirmed successfully.  
\- **BOOK\_ERROR** - An error occurred while booking or closing the service.  
\- **CANCELED** - Canceled service.  
\- **PRICE\_ERROR** - The service was booked, but a price change was detected when closing it with the provider. The tolerance to return **BOOKED** can be configured in Microsite Settings. If no value is configured, the system default tolerance is applied.  
\- **NOT\_BOOKED** - The service was not confirmed by the provider.  
\- **RQ** - Service on request, pending provider confirmation.  
\- **PENDING\_BOOK** - The service is still in the booking process.

**Booking statuses:**  
\- **NOT\_BOOKED** - The booking is considered not booked, typically when all services ended in non-confirmed statuses such as **BOOK\_ERROR** or **NOT\_BOOKED**.  
\- **RQ** - At least one service is in **RQ**. Some providers can return **RQ** in the [Book](#bookclosedtour) operation. TravelCApi has a scheduler that checks the status of the booking and updates it when it changes to **BOOKED**. You can check the booking status at any time right after BOOK by calling [Booking details](#closedtourbookingdetail) or [Refresh](#closedtourrefresh) . A booking can be closed in **RQ** even if the availability attribute **onRequest** was **false** during the flow.  
\- **PRICE\_ERROR** - At least one service has a price change error.  
\- **PENDING\_BOOK** - At least one service is still in **PENDING\_BOOK**.  
\- **BOOKED** - All services are in **BOOKED** and there is no previous booking error condition.  
\- **BOOK\_ERROR** - Fallback status when the booking is not fully confirmed and none of the previous cases apply.  
\- **CANCELED** - Canceled booking.

## 21\. Search Closed Tours request shows the results paginated. How should interpret or use correctly the pagination filter?

You can find the **first** value and the limit. First is the value in which you want to start (0 is the first position) and **limit** is the pull number.

## 22\. Regarding the booking flow: is there any problem if per each services request we get different valid Api token?

For the booking flow it is mandatory to use always the same token.  
For static content request there is no problem at all to use different API token.

## 23\. Do you manage Net Rates?

Yes, but it depends on the configuration of each Microsite and/or credentials connected.

## 24\. Do you manage Commissionable Rates?

Yes, but it depends on the configuration of each Microsite and/or credentials connected. The commission is defined per each credential.

## 25\. In case you manage Net and Commissionable rates, how can we identify them on the responses get?

It is not possible. The information of the rate type will be informed to you once you get your live credentials

## 26\. TravelC allows a price change tolerance at the moment of the booking confirmation. This tolerance can be configured per each Microsite. Which is the value of that tolerance?

Yes, it is something that can be configurable per each Microsite, as per % or fixed value. If it is not specified any value, then the tolerance set by default is 0,5%

## 27\. How can we get the different destination codes (destination ID)?

You can use the following API call: [getDestinations](https://online.travelcompositor.com/api/#/Web%20content/getDestinations) You will be able to get all the destination load for some specific microsite. For our test environment the microsite ID to use is this one: "apiaccommodation"

## 28\. How can we get the full list of valid codes for the node “phonecountryCode”?

We don’t have the list of the codes. This is an standard. We are working directly with the library **com.google.i18n.phonenumbers**

## 29\. Which fields are always mandatory?

There are structural data that will always be mandatory even if they are not provided in the **"requiredField"** of the **"confirm"** response.  
\- **"requestedAge"** is always mandatory.

## 30\. What are the mappings to the required field types?

"courtesyTitle" -> **TITLE**  
"name" -> **FIRST\_NAME**  
"lastName" -> **LAST\_NAME**  
"birthDate" -> **BIRTH\_DATE**  
"documentNumber" -> **DOCUMENT**  
"documentType" -> **DOCUMENT**. Document type has to be **PASSPORT** when the required type is **PASSPORT**  
"email" -> **EMAIL**  
"phoneCountryCode" -> **PHONE**  
"phone" -> **PHONE**  
"countryId" -> **COUNTRY**  
"passportExpirationDate" -> **DOCUMENT\_EXPIRY\_DATE**  
"address" -> **ADDRESS**  
"socialInsuranceNumber" -> **SOCIAL\_INSURANCE\_NUMBER**  
"billingNumber" -> **BILLING\_DOCUMENT**

TravelC Ticket API is designed to provide a set of API calls to bring ticket distribution to any website or device:

The TravelC Ticket API suite is divided into 3 parts:

\- **Booking flow**

\- **Static content**

\- **Post-booking**

The number of tickets available will depend on the providers connected by the customer.

Use our Postman collection to test our APIs now and familiarize yourself with them:

[Postman](https://online.travelcompositor.com/resources/api-ticket/TravelC_Api_Ticket.postman_collection.json)

If you don't have credentials yet, check out our [Getting started](https://online.travelcompositor.com/api/documentation/index.xhtml#intro) section to help you understand how to get started with the TravelC API

All API responses always return an audit object that the support team might request to trace requests.

```
"auditData": {
    "timestamp": "2022-11-15 09:05:14",
    "processTime": 69,
    "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWFwaS10ZXN0IiwiZXhwIjoxNjY4NTA0OTAxLCJqdGkiOiI5QUVGMDBGQS04RUZELTQ3MTEtQjBDNC0wNzI3RjY4NTM1QzkifQ.vfyVAoTjeuwrsB8WgTPB3-cpsc11oKoCWajp6XWfXvHh9usbyfJyIwK6G8yGHXF_wLSJKvVPF_urBgUMyQaNnw",
    "traceId": "9AEF00FA-8EFD-4711-B0C4-0727F68535C9",
    "availabilityId": 946,
    "server": "http://travelc-host-xxxx:xxxxx"
}
```

Below we show a flowchart with the steps necessary to complete a reservation through the API. Then we will explain each of the steps:

![](https://online.travelcompositor.com/resources/images/api-documentation/booking-ticket-flow.png)

This is the first step needed to create a new reservation.

**{{endpoint}}** /resources/booking/tickets/quote

\- **Destination Id**: It retrieves all available results from a specific TravelC destination. Contact our support team for information on how to retrieve destination codes.

Depending on the requested parameters, the API will provide you with all the results available for them. Each ticket will have a ticketKey, that will be necessary for the next step of the reservation.

**Quote tickets - Request**

Some considerations about quote:

\- It is important to note that the **auth-token** used in **Quote** calls must be the same throughout the booking flow. The token has an expiration of **120 minutes**, after this time you must start the booking process again from **Quote** or **Quote Single Ticket** with a new token.

\- The **timeout** is represented in milliseconds. Can be used to indicate the maximum waiting time for suppliers to return availability. The total time of the **processTime** request may differ by a few seconds.

```
{
    "checkIn": "2025-08-13",
    "checkOut": "2025-08-13",
    "persons": [
        {
            "age": 30
        }
    ],
    "language": "en",
    "sourceMarket": "st",
    "timeout": 3000,
    "destinationId": "MAD"
}
```

**Quote tickets - Response**

To proceed with the booking of a ticket you will need to call the next step, the [Quote Single Ticket](#quoteSingleTicket) , using the **ticketId** as parameter.

```
{
    "auditData": {
        "timestamp": "2025-05-29 13:55:48",
        "processTime": 2062,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDg1MzQxNDIsImp0aSI6IkJEMDU2QUM1LTUyMzEtNDg3MC05MkU4LTc4MTYyQTg4OTRCNyJ9.vkvfNVarLFKKGBZK53EPOJsOJ8fK7WPdsEZzWvtykKP5RgZkkYqlP-PjDxfNFCrOYmJQhmnG2RzPn429NHI5IQ",
        "traceId": "BD056AC5-5231-4870-92E8-78162A8894B7",
        "availabilityId": 633,
        "server": "http://localhost:30000"
    },
    "total": 2,
    "tickets": [
        {
            "name": "Cuenca's cathedral and city tour from Madrid",
            "ticketId": "MUS-54849af2-88d9-4725-b2ec-57a47a70b549",
            "provider": "FakeTickets",
            "fromPrice": {
                "amount": 52.63,
                "currency": "EUR"
            }
        },
        {
            "name": "Tour por Santiago + Degustación de productos típicos",
            "ticketId": "CIV-142380",
            "provider": "FakeTickets",
            "fromPrice": {
                "amount": 52.63,
                "currency": "EUR"
            }
        }
    ]
}
```

This operation will return all available modalities for a ticketId.

**{{endpoint}}** /resources/booking/tickets/ **{{ticketId}}** /quote

The **ticketKey** token expires in **40 minutes** during the quote step and in **60 minutes** in other steps. In each response, the **ticketKey** expiration is refreshed and starts over. After this time, you must start the booking process again from **Quote** or **Quote Single Ticket** with a new token.

```
{
    "checkIn": "2025-08-13",
    "checkOut": "2025-08-13",
    "persons": [
        {
            "age": 30
        }
    ],
    "language": "en",
    "sourceMarket": "st",
    "timeout": 3000
}
```

```
{
    "auditData": {
        "timestamp": "2025-05-29 13:55:59",
        "processTime": 247,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDg1MzQxNDIsImp0aSI6IkJEMDU2QUM1LTUyMzEtNDg3MC05MkU4LTc4MTYyQTg4OTRCNyJ9.vkvfNVarLFKKGBZK53EPOJsOJ8fK7WPdsEZzWvtykKP5RgZkkYqlP-PjDxfNFCrOYmJQhmnG2RzPn429NHI5IQ",
        "traceId": "BD056AC5-5231-4870-92E8-78162A8894B7",
        "availabilityId": 669,
        "server": "http://localhost:30000"
    },
    "provider": "FakeTickets",
    "modalities": [
        {
            "name": "deluxe",
            "operationDays": [
                {
                    "eventDate": "2025-07-13",
                    "eventTime": "09:00",
                    "eventLanguage": "Spanish",
                    "rates": [
                        {
                            "rateKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTMwMCIsInRpY2tldE1vZGFsaXR5TmFtZSI6ImRlbHV4ZSIsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VGcm9tIjo0LCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlVG8iOjE3LCJ0aWNrZXRNb2RhbGl0eUFtb3VudCI6MzAwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbXSwidGlja2V0TW9kYWxpdHlJc0ZyZWUiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uIjoxLjAsInRpY2tldE1vZGFsaXR5RHVyYXRpb25UeXBlIjoiSE9VUlMiLCJ0aWNrZXRNb2RhbGl0eU9uUmVxdWVzdCI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TWF4QWR1bHRzIjoyLCJ0aWNrZXRNb2RhbGl0eURpc2FibGVkIjpmYWxzZX0sIm1vZGFsaXR5UHJpY2VWTyI6eyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjowLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50IjozMDAuMCwidGlja2V0TW9kYWxpdHlQcmljZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlQcmljZVBlckdyb3VwUHJpY2UiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTWluQWdlIjoxOCwidGlja2V0TW9kYWxpdHlQcmljZU1heEFnZSI6OTAsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQ29uZmlybUFuZFByZWJvb2siOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQXZhaWxhYmxlQ2FwYWNpdHkiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlQcmljZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ29udHJhY3RTZXJ2aWNlUHJpY2VUeXBlIjpmYWxzZX0sInRpY2tldE9wZXJhdGlvbkRhdGVFdmVudERhdGUiOlsyMDI1LDcsMTNdLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRUaW1lIjpbOSwwXSwidGlja2V0T3BlcmF0aW9uRGF0ZUFtb3VudCI6MzAwLjAsInRpY2tldE9wZXJhdGlvbkRhdGVDdXJyZW5jeSI6IkVVUiIsInRpY2tldE9wZXJhdGlvbkRhdGVFdmVudExhbmd1YWdlIjoiZXMiLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ29uZmlybWVkRGF0ZSI6dHJ1ZSwidGlja2V0T3BlcmF0aW9uRGF0ZVNvcnROZXRQcmljZUJ5TWF4UHJpY2UiOmZhbHNlLCJ0aWNrZXRPcGVyYXRpb25EYXRlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRTZXJ2aWNlVGlja2V0SWQiOiJNVVMtNTQ4NDlhZjItODhkOS00NzI1LWIyZWMtNTdhNDdhNzBiNTQ5IiwidGlja2V0U2VydmljZVByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjo0MzgsImNoZWNrSW4iOlsyMDI1LDcsMTNdLCJjaGVja091dCI6WzIwMjUsNywxM10sInN0ZXAiOiJRVU9URUQiLCJhdmFpbGFiaWxpdHlJZCI6NjY5LCJkaXN0cmlidXRpb24iOnsicGVyc29uIjpbeyJpZCI6IjYxMDkxNDE0IiwicmVxdWVzdGVkQWdlIjozMH1dfSwibGFuZ3VhZ2UiOiJFTiIsInNvdXJjZU1hcmtldCI6IlNUIiwicGVyc29uQ291bnQiOjEsImRlc3RpbmF0aW9uSWQiOiJNQUQifQ.ipzZIvNfWHDo6wd1IM6PhBscxt0C93sO0cvzIX7jh-0",
                            "name": "Adult",
                            "canBookAlone": true,
                            "perGroupPrice": false,
                            "minAge": 18,
                            "maxAge": 90,
                            "price": {
                                "amount": 315.79,
                                "currency": "EUR"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "name": "standard",
            "operationDays": [
                {
                    "eventDate": "2025-07-13",
                    "eventTime": "09:00",
                    "eventLanguage": "Spanish",
                    "rates": [
                        {
                            "rateKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTE1MCIsInRpY2tldE1vZGFsaXR5TmFtZSI6InN0YW5kYXJkIiwidGlja2V0TW9kYWxpdHlDaGlsZEFnZUZyb20iOjQsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VUbyI6MTcsInRpY2tldE1vZGFsaXR5QW1vdW50IjoxNTAuMCwidGlja2V0TW9kYWxpdHlDdXJyZW5jeSI6IkVVUiIsInRpY2tldE1vZGFsaXR5U2hvd1ByaWNlUGVyUGVyc29uIjpmYWxzZSwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUFtb3VudCI6MC4wLCJ0aWNrZXRNb2RhbGl0eU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eU1pbmltdW1QYXhlc1RvQm9vayI6MCwidGlja2V0TW9kYWxpdHlNYXhpbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5Q2FuY2VsbGF0aW9uUG9saWNpZXMiOltdLCJ0aWNrZXRNb2RhbGl0eUlzRnJlZSI6ZmFsc2UsInRpY2tldE1vZGFsaXR5RHVyYXRpb24iOjEuMCwidGlja2V0TW9kYWxpdHlEdXJhdGlvblR5cGUiOiJIT1VSUyIsInRpY2tldE1vZGFsaXR5T25SZXF1ZXN0IjpmYWxzZSwidGlja2V0TW9kYWxpdHlNYXhBZHVsdHMiOjIsInRpY2tldE1vZGFsaXR5RGlzYWJsZWQiOmZhbHNlfSwibW9kYWxpdHlQcmljZVZPIjp7InRpY2tldE1vZGFsaXR5UHJpY2VDb2RlIjoiMCIsInRpY2tldE1vZGFsaXR5UHJpY2VOYW1lIjoiQWR1bHQiLCJ0aWNrZXRNb2RhbGl0eVByaWNlUXVhbnRpdHkiOjAsInRpY2tldE1vZGFsaXR5UHJpY2VDYW5Cb29rQWxvbmUiOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VBbW91bnQiOjE1MC4wLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlUGVyR3JvdXBQcmljZSI6ZmFsc2UsInRpY2tldE1vZGFsaXR5UHJpY2VNaW5BZ2UiOjE4LCJ0aWNrZXRNb2RhbGl0eVByaWNlTWF4QWdlIjo5MCwidGlja2V0TW9kYWxpdHlQcmljZVBlcmZvcm1Db25maXJtQW5kUHJlYm9vayI6dHJ1ZSwidGlja2V0TW9kYWxpdHlQcmljZVBlcmZvcm1BdmFpbGFibGVDYXBhY2l0eSI6ZmFsc2UsInRpY2tldE1vZGFsaXR5UHJpY2VOZXRDb21taXNzaW9uYWJsZUFtb3VudCI6MC4wLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVDdXJyZW5jeSI6IkVVUiIsInRpY2tldE1vZGFsaXR5UHJpY2VDb250cmFjdFNlcnZpY2VQcmljZVR5cGUiOmZhbHNlfSwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50RGF0ZSI6WzIwMjUsNywxM10sInRpY2tldE9wZXJhdGlvbkRhdGVFdmVudFRpbWUiOls5LDBdLCJ0aWNrZXRPcGVyYXRpb25EYXRlQW1vdW50IjoxNTAuMCwidGlja2V0T3BlcmF0aW9uRGF0ZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50TGFuZ3VhZ2UiOiJlcyIsInRpY2tldE9wZXJhdGlvbkRhdGVDb25maXJtZWREYXRlIjp0cnVlLCJ0aWNrZXRPcGVyYXRpb25EYXRlU29ydE5ldFByaWNlQnlNYXhQcmljZSI6ZmFsc2UsInRpY2tldE9wZXJhdGlvbkRhdGVOZXRDb21taXNzaW9uYWJsZUFtb3VudCI6MC4wLCJ0aWNrZXRPcGVyYXRpb25EYXRlTmV0Q29tbWlzc2lvbmFibGVDdXJyZW5jeSI6IkVVUiIsInRpY2tldFNlcnZpY2VUaWNrZXRJZCI6Ik1VUy01NDg0OWFmMi04OGQ5LTQ3MjUtYjJlYy01N2E0N2E3MGI1NDkiLCJ0aWNrZXRTZXJ2aWNlUHJvdmlkZXJDb25maWd1cmF0aW9uSWQiOjQzOCwiY2hlY2tJbiI6WzIwMjUsNywxM10sImNoZWNrT3V0IjpbMjAyNSw3LDEzXSwic3RlcCI6IlFVT1RFRCIsImF2YWlsYWJpbGl0eUlkIjo2NjksImRpc3RyaWJ1dGlvbiI6eyJwZXJzb24iOlt7ImlkIjoiNjEwOTE0MTQiLCJyZXF1ZXN0ZWRBZ2UiOjMwfV19LCJsYW5ndWFnZSI6IkVOIiwic291cmNlTWFya2V0IjoiU1QiLCJwZXJzb25Db3VudCI6MSwiZGVzdGluYXRpb25JZCI6Ik1BRCJ9.v1Ny9n-0MEtB9BC5WH6baJhx8OYf3SayOug22-DJd-M",
                            "name": "Adult",
                            "canBookAlone": true,
                            "perGroupPrice": false,
                            "minAge": 18,
                            "maxAge": 90,
                            "price": {
                                "amount": 157.89,
                                "currency": "EUR"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "name": "economic",
            "operationDays": [
                {
                    "eventDate": "2025-07-13",
                    "eventTime": "09:00",
                    "eventLanguage": "Spanish",
                    "rates": [
                        {
                            "rateKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTUwIiwidGlja2V0TW9kYWxpdHlOYW1lIjoiZWNvbm9taWMiLCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlRnJvbSI6NCwidGlja2V0TW9kYWxpdHlDaGlsZEFnZVRvIjoxNywidGlja2V0TW9kYWxpdHlBbW91bnQiOjUwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbXSwidGlja2V0TW9kYWxpdHlJc0ZyZWUiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uIjoxLjAsInRpY2tldE1vZGFsaXR5RHVyYXRpb25UeXBlIjoiSE9VUlMiLCJ0aWNrZXRNb2RhbGl0eU9uUmVxdWVzdCI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TWF4QWR1bHRzIjoyLCJ0aWNrZXRNb2RhbGl0eURpc2FibGVkIjpmYWxzZX0sIm1vZGFsaXR5UHJpY2VWTyI6eyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjowLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50Ijo1MC4wLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlUGVyR3JvdXBQcmljZSI6ZmFsc2UsInRpY2tldE1vZGFsaXR5UHJpY2VNaW5BZ2UiOjE4LCJ0aWNrZXRNb2RhbGl0eVByaWNlTWF4QWdlIjo5MCwidGlja2V0TW9kYWxpdHlQcmljZVBlcmZvcm1Db25maXJtQW5kUHJlYm9vayI6dHJ1ZSwidGlja2V0TW9kYWxpdHlQcmljZVBlcmZvcm1BdmFpbGFibGVDYXBhY2l0eSI6ZmFsc2UsInRpY2tldE1vZGFsaXR5UHJpY2VOZXRDb21taXNzaW9uYWJsZUFtb3VudCI6MC4wLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVDdXJyZW5jeSI6IkVVUiIsInRpY2tldE1vZGFsaXR5UHJpY2VDb250cmFjdFNlcnZpY2VQcmljZVR5cGUiOmZhbHNlfSwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50RGF0ZSI6WzIwMjUsNywxM10sInRpY2tldE9wZXJhdGlvbkRhdGVFdmVudFRpbWUiOls5LDBdLCJ0aWNrZXRPcGVyYXRpb25EYXRlQW1vdW50Ijo1MC4wLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRMYW5ndWFnZSI6ImVzIiwidGlja2V0T3BlcmF0aW9uRGF0ZUNvbmZpcm1lZERhdGUiOnRydWUsInRpY2tldE9wZXJhdGlvbkRhdGVTb3J0TmV0UHJpY2VCeU1heFByaWNlIjpmYWxzZSwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQW1vdW50IjowLjAsInRpY2tldE9wZXJhdGlvbkRhdGVOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0U2VydmljZVRpY2tldElkIjoiTVVTLTU0ODQ5YWYyLTg4ZDktNDcyNS1iMmVjLTU3YTQ3YTcwYjU0OSIsInRpY2tldFNlcnZpY2VQcm92aWRlckNvbmZpZ3VyYXRpb25JZCI6NDM4LCJjaGVja0luIjpbMjAyNSw3LDEzXSwiY2hlY2tPdXQiOlsyMDI1LDcsMTNdLCJzdGVwIjoiUVVPVEVEIiwiYXZhaWxhYmlsaXR5SWQiOjY2OSwiZGlzdHJpYnV0aW9uIjp7InBlcnNvbiI6W3siaWQiOiI2MTA5MTQxNCIsInJlcXVlc3RlZEFnZSI6MzB9XX0sImxhbmd1YWdlIjoiRU4iLCJzb3VyY2VNYXJrZXQiOiJTVCIsInBlcnNvbkNvdW50IjoxLCJkZXN0aW5hdGlvbklkIjoiTUFEIn0.uKMPDwRpOBmdcQV-03F4p90rPLm2BIWlmT3kVpV4cVw",
                            "name": "Adult",
                            "canBookAlone": true,
                            "perGroupPrice": false,
                            "minAge": 18,
                            "maxAge": 90,
                            "price": {
                                "amount": 52.63,
                                "currency": "EUR"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}
```

This operation returns the confirmation of the selected modality. This means:

\- Confirmation of cancellation policies

\- All the comments of the modality

\- Returns the required passenger fields for that ticket. Contact persons refers to the first person of the first distribution

```
{
    "ticket": {
        "rates": [
            {
                "rateKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTMwMCIsInRpY2tldE1vZGFsaXR5TmFtZSI6ImRlbHV4ZSIsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VGcm9tIjo0LCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlVG8iOjE3LCJ0aWNrZXRNb2RhbGl0eUFtb3VudCI6MzAwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbXSwidGlja2V0TW9kYWxpdHlJc0ZyZWUiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uIjoxLjAsInRpY2tldE1vZGFsaXR5RHVyYXRpb25UeXBlIjoiSE9VUlMiLCJ0aWNrZXRNb2RhbGl0eU9uUmVxdWVzdCI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TWF4QWR1bHRzIjoyLCJ0aWNrZXRNb2RhbGl0eURpc2FibGVkIjpmYWxzZX0sIm1vZGFsaXR5UHJpY2VWTyI6eyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjowLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50IjozMDAuMCwidGlja2V0TW9kYWxpdHlQcmljZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlQcmljZVBlckdyb3VwUHJpY2UiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTWluQWdlIjoxOCwidGlja2V0TW9kYWxpdHlQcmljZU1heEFnZSI6OTAsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQ29uZmlybUFuZFByZWJvb2siOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQXZhaWxhYmxlQ2FwYWNpdHkiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlQcmljZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ29udHJhY3RTZXJ2aWNlUHJpY2VUeXBlIjpmYWxzZX0sInRpY2tldE9wZXJhdGlvbkRhdGVFdmVudERhdGUiOlsyMDI1LDcsMTNdLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRUaW1lIjpbOSwwXSwidGlja2V0T3BlcmF0aW9uRGF0ZUFtb3VudCI6MzAwLjAsInRpY2tldE9wZXJhdGlvbkRhdGVDdXJyZW5jeSI6IkVVUiIsInRpY2tldE9wZXJhdGlvbkRhdGVFdmVudExhbmd1YWdlIjoiZXMiLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ29uZmlybWVkRGF0ZSI6dHJ1ZSwidGlja2V0T3BlcmF0aW9uRGF0ZVNvcnROZXRQcmljZUJ5TWF4UHJpY2UiOmZhbHNlLCJ0aWNrZXRPcGVyYXRpb25EYXRlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRTZXJ2aWNlVGlja2V0SWQiOiJNVVMtNTQ4NDlhZjItODhkOS00NzI1LWIyZWMtNTdhNDdhNzBiNTQ5IiwidGlja2V0U2VydmljZVByb3ZpZGVyQ29uZmlndXJhdGlvbklkIjo0MzgsImNoZWNrSW4iOlsyMDI1LDcsMTNdLCJjaGVja091dCI6WzIwMjUsNywxM10sInN0ZXAiOiJRVU9URUQiLCJhdmFpbGFiaWxpdHlJZCI6NTg4LCJkaXN0cmlidXRpb24iOnsicGVyc29uIjpbeyJpZCI6IjI0OTg1MzA2IiwicmVxdWVzdGVkQWdlIjozMH1dfSwibGFuZ3VhZ2UiOiJFTiIsInNvdXJjZU1hcmtldCI6IlNUIiwicGVyc29uQ291bnQiOjEsImRlc3RpbmF0aW9uSWQiOiJNQUQifQ.NLQcO4hyDsQpC3YYOVHMjbYTck6qux83kknSMnHKL6U",
                "quantity": 1
            }
        ]
    }
}
```

```
{
    "auditData": {
        "timestamp": "2025-05-29 13:56:04",
        "processTime": 258,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDg1MzQxNDIsImp0aSI6IkJEMDU2QUM1LTUyMzEtNDg3MC05MkU4LTc4MTYyQTg4OTRCNyJ9.vkvfNVarLFKKGBZK53EPOJsOJ8fK7WPdsEZzWvtykKP5RgZkkYqlP-PjDxfNFCrOYmJQhmnG2RzPn429NHI5IQ",
        "traceId": "BD056AC5-5231-4870-92E8-78162A8894B7",
        "availabilityId": 669,
        "server": "http://localhost:30000"
    },
    "warnings": [],
    "requiredPassengerData": {
        "contactPerson": [
            "EMAIL"
        ],
        "otherPersons": []
    },
    "ticket": {
        "ticketKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTMwMCIsInRpY2tldE1vZGFsaXR5TmFtZSI6ImRlbHV4ZSIsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VGcm9tIjo0LCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlVG8iOjE3LCJ0aWNrZXRNb2RhbGl0eUFtb3VudCI6MzAwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNS0wNS0yOCIsImFtb3VudCI6eyJhbW91bnQiOjc1LjAsImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjUtMDctMDYiLCJhbW91bnQiOnsiYW1vdW50IjoxNTAuMCwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wNy0xMiIsImFtb3VudCI6eyJhbW91bnQiOjMwMC4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sInRpY2tldE1vZGFsaXR5SXNGcmVlIjpmYWxzZSwidGlja2V0TW9kYWxpdHlEdXJhdGlvbiI6MS4wLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uVHlwZSI6IkhPVVJTIiwidGlja2V0TW9kYWxpdHlPblJlcXVlc3QiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eU1heEFkdWx0cyI6MiwidGlja2V0TW9kYWxpdHlEaXNhYmxlZCI6ZmFsc2V9LCJzZWxlY3RlZE1vZGFsaXR5UHJpY2VzIjpbeyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjoxLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50IjozMDAuMCwidGlja2V0TW9kYWxpdHlQcmljZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlQcmljZVBlckdyb3VwUHJpY2UiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTWluQWdlIjoxOCwidGlja2V0TW9kYWxpdHlQcmljZU1heEFnZSI6OTAsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQ29uZmlybUFuZFByZWJvb2siOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQXZhaWxhYmxlQ2FwYWNpdHkiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlQcmljZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ29udHJhY3RTZXJ2aWNlUHJpY2VUeXBlIjpmYWxzZX1dLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnREYXRlIjpbMjAyNSw3LDEzXSwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50VGltZSI6WzksMF0sInRpY2tldE9wZXJhdGlvbkRhdGVBbW91bnQiOjMwMC4wLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRMYW5ndWFnZSI6ImVzIiwidGlja2V0T3BlcmF0aW9uRGF0ZUNvbmZpcm1lZERhdGUiOnRydWUsInRpY2tldE9wZXJhdGlvbkRhdGVTb3J0TmV0UHJpY2VCeU1heFByaWNlIjpmYWxzZSwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQW1vdW50IjowLjAsInRpY2tldE9wZXJhdGlvbkRhdGVOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0U2VydmljZVRpY2tldElkIjoiTVVTLTU0ODQ5YWYyLTg4ZDktNDcyNS1iMmVjLTU3YTQ3YTcwYjU0OSIsInRpY2tldFNlcnZpY2VQcm92aWRlckNvbmZpZ3VyYXRpb25JZCI6NDM4LCJ0aWNrZXRSZXF1aXJlZEZpZWxkQ29udGFjdCI6WyJFTUFJTCJdLCJ0aWNrZXRSZXF1aXJlZEZpZWxkT3RoZXJzIjpbXSwidGlja2V0U2VydmljZUFkZGl0aW9uYWxSZXF1aXJlZFBhc3NlbmdlckRhdGEiOlt7InF1ZXN0aW9uQ29kZSI6IlNQRUNJQUxfUkVRVUlSRU1FTlRTIiwicXVlc3Rpb25EZXNjcmlwdGlvbiI6IlNwZWNpYWwgcmVxdWlyZW1lbnRzIiwicXVlc3Rpb25UeXBlIjoiVEVYVCIsInF1ZXN0aW9uT3B0aW9ucyI6W10sIm1haW5Db250YWN0IjpmYWxzZSwibWFuZGF0b3J5IjpmYWxzZSwiYWRkaXRpb25hbFJlcXVpcmVkRGF0YVR5cGUiOiJQUk9WSURFUiIsImhpZGRlbiI6ZmFsc2V9LHsicXVlc3Rpb25Db2RlIjoiTEFOR1VBR0VfR1VJREUiLCJxdWVzdGlvbkRlc2NyaXB0aW9uIjoiWW91IG11c3Qgc2VsZWN0IHRoZSBsYW5ndWFnZSBvZiB0aGUgYWN0aXZpdHkiLCJxdWVzdGlvblR5cGUiOiJPUFRJT05TIiwicXVlc3Rpb25PcHRpb25zIjpbeyJjb2RlIjoiR1VJREV8ZW4iLCJkZXNjcmlwdGlvbiI6IkVuZ2xpc2ggKGd1aWRlKSJ9LHsiY29kZSI6IkdVSURFfGVzIiwiZGVzY3JpcHRpb24iOiJTcGFuaXNoIChndWlkZSkifV0sIm1haW5Db250YWN0IjpmYWxzZSwibWFuZGF0b3J5Ijp0cnVlLCJhZGRpdGlvbmFsUmVxdWlyZWREYXRhVHlwZSI6IlRSQVZFTEMiLCJoaWRkZW4iOmZhbHNlfV0sImNoZWNrSW4iOlsyMDI1LDcsMTNdLCJjaGVja091dCI6WzIwMjUsNywxM10sInN0ZXAiOiJDT05GSVJNRUQiLCJhdmFpbGFiaWxpdHlJZCI6NjY5LCJkaXN0cmlidXRpb24iOnsicGVyc29uIjpbeyJpZCI6Ijc5MDM4OTU3IiwicmVxdWVzdGVkQWdlIjozMH1dfSwibGFuZ3VhZ2UiOiJFTiIsInNvdXJjZU1hcmtldCI6IlNUIiwicGVyc29uQ291bnQiOjEsImRlc3RpbmF0aW9uSWQiOiJNQUQifQ.wXxw48nwDJe7Fi3mu3QsqJVrWltjhYKNiu0oO3zfWoQ",
        "additionalRequiredData": [
            {
                "questionCode": "SPECIAL_REQUIREMENTS",
                "questionDescription": "Special requirements",
                "questionType": "TEXT",
                "questionOptions": [],
                "mainContact": false,
                "mandatory": false,
                "additionalRequiredDataType": "PROVIDER",
                "hidden": false
            },
            {
                "questionCode": "LANGUAGE_GUIDE",
                "questionDescription": "You must select the language of the activity",
                "questionType": "OPTIONS",
                "questionOptions": [
                    {
                        "code": "GUIDE|en",
                        "description": "English (guide)"
                    },
                    {
                        "code": "GUIDE|es",
                        "description": "Spanish (guide)"
                    }
                ],
                "mainContact": false,
                "mandatory": true,
                "additionalRequiredDataType": "TRAVELC",
                "hidden": false
            }
        ],
        "name": "Cuenca's cathedral and city tour from Madrid",
        "price": {
            "amount": 315.79,
            "currency": "EUR"
        },
        "cancellationPolicies": [
            {
                "date": "2025-05-28",
                "amount": {
                    "amount": 78.95,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-06",
                "amount": {
                    "amount": 157.89,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-12",
                "amount": {
                    "amount": 315.79,
                    "currency": "EUR"
                }
            }
        ],
        "remarks": [],
        "modality": {
            "name": "deluxe",
            "duration": 1.0,
            "durationType": "HOURS",
            "onRequest": false,
            "rates": [
                {
                    "name": "Adult",
                    "quantity": 1
                }
            ]
        }
    }
}
```

This operation creates a pre-reservation of the selected modality. Some considerations:

\- The required data of the required guests, indicated in the response of the [Confirm](#confirmticket) operation, must be sent.

\- The distribution sent must match the one requested in the calls of [Quote Single Ticket](#quoteSingleTicket) as well as the **requestedAge** of each guest.

\- Prebook step is an extra call to the provider to validate that all the information received on the Confirm is correct.

\- This call allows to confirm that all the data received to be booked is correct: price, cancelation policies… and we strongly recommend double check this data before the book step

\- The ticketKey returned in the [Confirm](#confirmTicket) operation, must be sent.

```
{
    "ticket": {
        "ticketKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTMwMCIsInRpY2tldE1vZGFsaXR5TmFtZSI6ImRlbHV4ZSIsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VGcm9tIjo0LCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlVG8iOjE3LCJ0aWNrZXRNb2RhbGl0eUFtb3VudCI6MzAwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNS0wNS0yNyIsImFtb3VudCI6eyJhbW91bnQiOjc1LjAsImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjUtMDctMDYiLCJhbW91bnQiOnsiYW1vdW50IjoxNTAuMCwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wNy0xMiIsImFtb3VudCI6eyJhbW91bnQiOjMwMC4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sInRpY2tldE1vZGFsaXR5SXNGcmVlIjpmYWxzZSwidGlja2V0TW9kYWxpdHlEdXJhdGlvbiI6MS4wLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uVHlwZSI6IkhPVVJTIiwidGlja2V0TW9kYWxpdHlPblJlcXVlc3QiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eU1heEFkdWx0cyI6MiwidGlja2V0TW9kYWxpdHlEaXNhYmxlZCI6ZmFsc2V9LCJzZWxlY3RlZE1vZGFsaXR5UHJpY2VzIjpbeyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjoxLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50IjozMDAuMCwidGlja2V0TW9kYWxpdHlQcmljZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlQcmljZVBlckdyb3VwUHJpY2UiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTWluQWdlIjoxOCwidGlja2V0TW9kYWxpdHlQcmljZU1heEFnZSI6OTAsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQ29uZmlybUFuZFByZWJvb2siOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQXZhaWxhYmxlQ2FwYWNpdHkiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlQcmljZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ29udHJhY3RTZXJ2aWNlUHJpY2VUeXBlIjpmYWxzZX1dLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnREYXRlIjpbMjAyNSw3LDEzXSwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50VGltZSI6WzksMF0sInRpY2tldE9wZXJhdGlvbkRhdGVBbW91bnQiOjMwMC4wLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRMYW5ndWFnZSI6ImVzIiwidGlja2V0T3BlcmF0aW9uRGF0ZUNvbmZpcm1lZERhdGUiOnRydWUsInRpY2tldE9wZXJhdGlvbkRhdGVTb3J0TmV0UHJpY2VCeU1heFByaWNlIjpmYWxzZSwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQW1vdW50IjowLjAsInRpY2tldE9wZXJhdGlvbkRhdGVOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0U2VydmljZVRpY2tldElkIjoiTVVTLTU0ODQ5YWYyLTg4ZDktNDcyNS1iMmVjLTU3YTQ3YTcwYjU0OSIsInRpY2tldFNlcnZpY2VQcm92aWRlckNvbmZpZ3VyYXRpb25JZCI6NDM4LCJ0aWNrZXRSZXF1aXJlZEZpZWxkQ29udGFjdCI6WyJFTUFJTCJdLCJ0aWNrZXRSZXF1aXJlZEZpZWxkT3RoZXJzIjpbXSwidGlja2V0U2VydmljZUFkZGl0aW9uYWxSZXF1aXJlZFBhc3NlbmdlckRhdGEiOlt7InF1ZXN0aW9uQ29kZSI6IlNQRUNJQUxfUkVRVUlSRU1FTlRTIiwicXVlc3Rpb25EZXNjcmlwdGlvbiI6IlNwZWNpYWwgcmVxdWlyZW1lbnRzIiwicXVlc3Rpb25UeXBlIjoiVEVYVCIsInF1ZXN0aW9uT3B0aW9ucyI6W10sIm1haW5Db250YWN0IjpmYWxzZSwibWFuZGF0b3J5IjpmYWxzZSwiYWRkaXRpb25hbFJlcXVpcmVkRGF0YVR5cGUiOiJQUk9WSURFUiIsImhpZGRlbiI6ZmFsc2V9LHsicXVlc3Rpb25Db2RlIjoiTEFOR1VBR0VfR1VJREUiLCJxdWVzdGlvbkRlc2NyaXB0aW9uIjoiWW91IG11c3Qgc2VsZWN0IHRoZSBsYW5ndWFnZSBvZiB0aGUgYWN0aXZpdHkiLCJxdWVzdGlvblR5cGUiOiJPUFRJT05TIiwicXVlc3Rpb25PcHRpb25zIjpbeyJjb2RlIjoiR1VJREV8ZW4iLCJkZXNjcmlwdGlvbiI6IkVuZ2xpc2ggKGd1aWRlKSJ9LHsiY29kZSI6IkdVSURFfGVzIiwiZGVzY3JpcHRpb24iOiJTcGFuaXNoIChndWlkZSkifV0sIm1haW5Db250YWN0IjpmYWxzZSwibWFuZGF0b3J5Ijp0cnVlLCJhZGRpdGlvbmFsUmVxdWlyZWREYXRhVHlwZSI6IlRSQVZFTEMiLCJoaWRkZW4iOmZhbHNlfV0sImNoZWNrSW4iOlsyMDI1LDcsMTNdLCJjaGVja091dCI6WzIwMjUsNywxM10sInN0ZXAiOiJDT05GSVJNRUQiLCJhdmFpbGFiaWxpdHlJZCI6NTg4LCJkaXN0cmlidXRpb24iOnsicGVyc29uIjpbeyJpZCI6IjUwNDA4MTY4IiwicmVxdWVzdGVkQWdlIjozMH1dfSwibGFuZ3VhZ2UiOiJFTiIsInNvdXJjZU1hcmtldCI6IlNUIiwicGVyc29uQ291bnQiOjEsImRlc3RpbmF0aW9uSWQiOiJNQUQifQ.mY3yJ5MS0ioy02Qi4KDBbAGtlL9EGjLeWzODWp2J2cw",
        "additionalRequiredData": [
            {
                "questionCode": "SPECIAL_REQUIREMENTS",
                "answer": "Wheelchair"
            },
            {
                "questionCode": "LANGUAGE_GUIDE",
                "answer": "GUIDE|en"
            }
        ]
    },
    "persons": [
        {
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        }
    ]
}
```

**Prebook - Response**

```
{
    "auditData": {
        "timestamp": "2025-05-28 15:23:24",
        "processTime": 100,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDg0NTI5MjEsImp0aSI6IkE2RTBDNEIyLTYwRDctNDVBNi05M0RDLTUzRjdEREI4QjQ3MiJ9.-A7RS6lsBASAdqu1lLL2gFXlUAmQmVF9Iqnk8Q-vHWj6sB6427BP9qrC4uZ5CpEdwtDBIyUzP1FUZiE4DtSZvw",
        "traceId": "A6E0C4B2-60D7-45A6-93DC-53F7DDB8B472",
        "availabilityId": 120,
        "server": "http://localhost:30000"
    },
    "warnings": [],
    "persons": [
        {
            "id": "45474389",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        }
    ],
    "ticket": {
        "ticketKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTMwMCIsInRpY2tldE1vZGFsaXR5TmFtZSI6ImRlbHV4ZSIsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VGcm9tIjo0LCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlVG8iOjE3LCJ0aWNrZXRNb2RhbGl0eUFtb3VudCI6MzAwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNS0wNS0yNyIsImFtb3VudCI6eyJhbW91bnQiOjc1LjAsImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjUtMDctMDYiLCJhbW91bnQiOnsiYW1vdW50IjoxNTAuMCwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wNy0xMiIsImFtb3VudCI6eyJhbW91bnQiOjMwMC4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sInRpY2tldE1vZGFsaXR5SXNGcmVlIjpmYWxzZSwidGlja2V0TW9kYWxpdHlEdXJhdGlvbiI6MS4wLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uVHlwZSI6IkhPVVJTIiwidGlja2V0TW9kYWxpdHlPblJlcXVlc3QiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eU1heEFkdWx0cyI6MiwidGlja2V0TW9kYWxpdHlEaXNhYmxlZCI6ZmFsc2V9LCJzZWxlY3RlZE1vZGFsaXR5UHJpY2VzIjpbeyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjoxLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50IjozMDAuMCwidGlja2V0TW9kYWxpdHlQcmljZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlQcmljZVBlckdyb3VwUHJpY2UiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTWluQWdlIjoxOCwidGlja2V0TW9kYWxpdHlQcmljZU1heEFnZSI6OTAsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQ29uZmlybUFuZFByZWJvb2siOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQXZhaWxhYmxlQ2FwYWNpdHkiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlQcmljZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ29udHJhY3RTZXJ2aWNlUHJpY2VUeXBlIjpmYWxzZX1dLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnREYXRlIjpbMjAyNSw3LDEzXSwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50VGltZSI6WzksMF0sInRpY2tldE9wZXJhdGlvbkRhdGVBbW91bnQiOjMwMC4wLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRMYW5ndWFnZSI6ImVzIiwidGlja2V0T3BlcmF0aW9uRGF0ZUNvbmZpcm1lZERhdGUiOnRydWUsInRpY2tldE9wZXJhdGlvbkRhdGVTb3J0TmV0UHJpY2VCeU1heFByaWNlIjpmYWxzZSwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQW1vdW50IjowLjAsInRpY2tldE9wZXJhdGlvbkRhdGVOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0U2VydmljZVRpY2tldElkIjoiTVVTLTU0ODQ5YWYyLTg4ZDktNDcyNS1iMmVjLTU3YTQ3YTcwYjU0OSIsInRpY2tldFNlcnZpY2VQcm92aWRlckNvbmZpZ3VyYXRpb25JZCI6NDM4LCJjaGVja0luIjpbMjAyNSw3LDEzXSwiY2hlY2tPdXQiOlsyMDI1LDcsMTNdLCJzdGVwIjoiUFJFQk9PS0VEIiwiYXZhaWxhYmlsaXR5SWQiOjEyMCwiZGlzdHJpYnV0aW9uIjp7InBlcnNvbiI6W3siaWQiOiI0NTQ3NDM4OSIsIm5hbWUiOiJUZXN0IiwibGFzdE5hbWUiOiJUZXN0IiwicmVxdWVzdGVkQWdlIjozMCwiY291cnRlc3lUaXRsZSI6Ik1JU1RFUiIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBob25lQ291bnRyeUNvZGUiOiIrMzQiLCJwaG9uZSI6IjY2NjY2NjY2NiJ9XX0sImxhbmd1YWdlIjoiRU4iLCJzb3VyY2VNYXJrZXQiOiJTVCIsInBlcnNvbkNvdW50IjoxLCJkZXN0aW5hdGlvbklkIjoiTUFEIn0.Fp55xigqBzQx3ye3uJXO47aiisBTKJRwVwnN-x-S-Uc",
        "name": "Cuenca's cathedral and city tour from Madrid",
        "price": {
            "amount": 315.79,
            "currency": "EUR"
        },
        "cancellationPolicies": [
            {
                "date": "2025-05-27",
                "amount": {
                    "amount": 78.95,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-06",
                "amount": {
                    "amount": 157.89,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-12",
                "amount": {
                    "amount": 315.79,
                    "currency": "EUR"
                }
            }
        ],
        "remarks": [],
        "modality": {
            "name": "deluxe",
            "duration": 1.0,
            "durationType": "HOURS",
            "onRequest": false,
            "rates": [
                {
                    "name": "Adult",
                    "quantity": 1
                }
            ]
        }
    }
}
```

This operation creates a reservation of the selected modality. Some considerations:

\- The **fakeBooking** attribute is optional. If not sent, the reservation will be closed as BOOKED in the test environment or with the actual state returned by the vendor in the production environment. This attribute is useful if you want to simulate an error, in which case you can send BOOK\_ERROR. Keep in mind that with the **fakeBooking** attribute the reservation will not be persisted in the Travelcompositor system or sent to suppliers if it is in a production environment.

\- The **externalReference** attribute is optional. It can be used to save the customer's reference and thus link it to the generated reservation.

```
{
    "ticket": {
        "ticketKey": "eyJhbGciOiJIUzI1NiJ9.eyJtb2RhbGl0eVZPIjp7InRpY2tldE1vZGFsaXR5Q29kZSI6IjU0ODQ5YWYyLTMwMCIsInRpY2tldE1vZGFsaXR5TmFtZSI6ImRlbHV4ZSIsInRpY2tldE1vZGFsaXR5Q2hpbGRBZ2VGcm9tIjo0LCJ0aWNrZXRNb2RhbGl0eUNoaWxkQWdlVG8iOjE3LCJ0aWNrZXRNb2RhbGl0eUFtb3VudCI6MzAwLjAsInRpY2tldE1vZGFsaXR5Q3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVNob3dQcmljZVBlclBlcnNvbiI6ZmFsc2UsInRpY2tldE1vZGFsaXR5TmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlNaW5pbXVtUGF4ZXNUb0Jvb2siOjAsInRpY2tldE1vZGFsaXR5TWF4aW11bVBheGVzVG9Cb29rIjowLCJ0aWNrZXRNb2RhbGl0eUNhbmNlbGxhdGlvblBvbGljaWVzIjpbeyJkYXRlIjoiMjAyNS0wNS0yNyIsImFtb3VudCI6eyJhbW91bnQiOjc1LjAsImN1cnJlbmN5IjoiRVVSIn19LHsiZGF0ZSI6IjIwMjUtMDctMDYiLCJhbW91bnQiOnsiYW1vdW50IjoxNTAuMCwiY3VycmVuY3kiOiJFVVIifX0seyJkYXRlIjoiMjAyNS0wNy0xMiIsImFtb3VudCI6eyJhbW91bnQiOjMwMC4wLCJjdXJyZW5jeSI6IkVVUiJ9fV0sInRpY2tldE1vZGFsaXR5SXNGcmVlIjpmYWxzZSwidGlja2V0TW9kYWxpdHlEdXJhdGlvbiI6MS4wLCJ0aWNrZXRNb2RhbGl0eUR1cmF0aW9uVHlwZSI6IkhPVVJTIiwidGlja2V0TW9kYWxpdHlPblJlcXVlc3QiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eU1heEFkdWx0cyI6MiwidGlja2V0TW9kYWxpdHlEaXNhYmxlZCI6ZmFsc2V9LCJzZWxlY3RlZE1vZGFsaXR5UHJpY2VzIjpbeyJ0aWNrZXRNb2RhbGl0eVByaWNlQ29kZSI6IjAiLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmFtZSI6IkFkdWx0IiwidGlja2V0TW9kYWxpdHlQcmljZVF1YW50aXR5IjoxLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ2FuQm9va0Fsb25lIjp0cnVlLCJ0aWNrZXRNb2RhbGl0eVByaWNlQW1vdW50IjozMDAuMCwidGlja2V0TW9kYWxpdHlQcmljZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0TW9kYWxpdHlQcmljZVBlckdyb3VwUHJpY2UiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTWluQWdlIjoxOCwidGlja2V0TW9kYWxpdHlQcmljZU1heEFnZSI6OTAsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQ29uZmlybUFuZFByZWJvb2siOnRydWUsInRpY2tldE1vZGFsaXR5UHJpY2VQZXJmb3JtQXZhaWxhYmxlQ2FwYWNpdHkiOmZhbHNlLCJ0aWNrZXRNb2RhbGl0eVByaWNlTmV0Q29tbWlzc2lvbmFibGVBbW91bnQiOjAuMCwidGlja2V0TW9kYWxpdHlQcmljZU5ldENvbW1pc3Npb25hYmxlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRNb2RhbGl0eVByaWNlQ29udHJhY3RTZXJ2aWNlUHJpY2VUeXBlIjpmYWxzZX1dLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnREYXRlIjpbMjAyNSw3LDEzXSwidGlja2V0T3BlcmF0aW9uRGF0ZUV2ZW50VGltZSI6WzksMF0sInRpY2tldE9wZXJhdGlvbkRhdGVBbW91bnQiOjMwMC4wLCJ0aWNrZXRPcGVyYXRpb25EYXRlQ3VycmVuY3kiOiJFVVIiLCJ0aWNrZXRPcGVyYXRpb25EYXRlRXZlbnRMYW5ndWFnZSI6ImVzIiwidGlja2V0T3BlcmF0aW9uRGF0ZUNvbmZpcm1lZERhdGUiOnRydWUsInRpY2tldE9wZXJhdGlvbkRhdGVTb3J0TmV0UHJpY2VCeU1heFByaWNlIjpmYWxzZSwidGlja2V0T3BlcmF0aW9uRGF0ZU5ldENvbW1pc3Npb25hYmxlQW1vdW50IjowLjAsInRpY2tldE9wZXJhdGlvbkRhdGVOZXRDb21taXNzaW9uYWJsZUN1cnJlbmN5IjoiRVVSIiwidGlja2V0U2VydmljZVRpY2tldElkIjoiTVVTLTU0ODQ5YWYyLTg4ZDktNDcyNS1iMmVjLTU3YTQ3YTcwYjU0OSIsInRpY2tldFNlcnZpY2VQcm92aWRlckNvbmZpZ3VyYXRpb25JZCI6NDM4LCJjaGVja0luIjpbMjAyNSw3LDEzXSwiY2hlY2tPdXQiOlsyMDI1LDcsMTNdLCJzdGVwIjoiUFJFQk9PS0VEIiwiYXZhaWxhYmlsaXR5SWQiOjU4OCwiZGlzdHJpYnV0aW9uIjp7InBlcnNvbiI6W3siaWQiOiI1MDE5ODQxNCIsIm5hbWUiOiJUZXN0IiwibGFzdE5hbWUiOiJUZXN0IiwicmVxdWVzdGVkQWdlIjozMCwiY291cnRlc3lUaXRsZSI6Ik1JU1RFUiIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBob25lQ291bnRyeUNvZGUiOiIrMzQiLCJwaG9uZSI6IjY2NjY2NjY2NiJ9XX0sImxhbmd1YWdlIjoiRU4iLCJzb3VyY2VNYXJrZXQiOiJTVCIsInBlcnNvbkNvdW50IjoxLCJkZXN0aW5hdGlvbklkIjoiTUFEIn0.1-PvaXWposSwaZzIk6P_m4k2orBfZyotkryj2l9ucrw",
        "externalReference": "test"
    }
}
```

```
{
    "auditData": {
        "timestamp": "2025-05-28 15:23:54",
        "processTime": 760,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDg0NTI5MjEsImp0aSI6IkE2RTBDNEIyLTYwRDctNDVBNi05M0RDLTUzRjdEREI4QjQ3MiJ9.-A7RS6lsBASAdqu1lLL2gFXlUAmQmVF9Iqnk8Q-vHWj6sB6427BP9qrC4uZ5CpEdwtDBIyUzP1FUZiE4DtSZvw",
        "traceId": "A6E0C4B2-60D7-45A6-93DC-53F7DDB8B472",
        "availabilityId": 120,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-26059",
    "status": "BOOKED",
    "persons": [
        {
            "id": "TRC-26059-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        }
    ],
    "ticket": {
        "bookingReference": "FAKE-2131698844",
        "status": "BOOKED",
        "name": "Cuenca's cathedral and city tour from Madrid",
        "price": {
            "amount": 315.79,
            "currency": "EUR"
        },
        "cancellationPolicies": [
            {
                "date": "2025-05-27",
                "amount": {
                    "amount": 78.95,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-06",
                "amount": {
                    "amount": 157.89,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-12",
                "amount": {
                    "amount": 315.79,
                    "currency": "EUR"
                }
            }
        ],
        "remarks": [],
        "modality": {
            "name": "deluxe",
            "duration": 1.0,
            "durationType": "HOURS",
            "onRequest": false,
            "rates": [
                {
                    "name": "Adult",
                    "quantity": 1
                }
            ]
        }
    }
}
```

This operation allows you to retrieve the detailed information of a ticket using the **ticketId**.

```
curl --location 'default.localhost/resources/ticket/datasheet/default/CIV-2192' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDg4NjcwOTgsImp0aSI6IjM5ODJBOTAxLTk2N0YtNERFNy1BQkEyLTkyMzc0MzE5REU1MCJ9.Vc0FNqdkLxtJDdpKqKkJAUGCRILuZJKuiXsXVj13xGapTLqsoeb_DzqfR2Ahtv9gkK6NL5GUQxk_2ZEkIFul6Q' \
--header 'Accept-Encoding: gzip' \
--header 'Cookie: backend=host.docker.internal:30000'
```

```
{
    "id": "CIV-36452",
    "name": "Entrada a Faunia",
    "description": "Deja el bullicio de Madrid para adentrarte en Faunia, una combinación de ecosistemas.",
    "duration": "",
    "activityType": "Tickets",
    "imageUrls": [
        "https://f.civitatis.com/espana/madrid/galeria/big/ejemplar-perrito-pradera.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/colorido-faunia.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/reptil-asombro-faunia.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/piscina-focas-faunia.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/ramas-lemur-faumia.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/cocodrilo-plano-faunia.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/foca-faunia.jpg",
        "https://f.civitatis.com/espana/madrid/galeria/big/samiri-inolvidable.jpg"
    ],
    "geolocation": {
        "latitude": 40.3921241,
        "longitude": -3.6147587
    },
    "city": "Madrid, España",
    "restrictions": [],
    "included: [
        "Entrada a Faunia",
        "Guia en español"
    ],
    "excluded: [
        "Comidas y bebidas"
    ],
    "rating": {
        "averageRating": 8.6,
        "totalReviews": 1287
    }
}
```

This method returns all **ticket categories** translated in the requested language ticketId.

```
curl -X 'GET' \'https://online.travelcompositor.com/resources/ticket/categories' \
  -H 'accept: application/json' \
  -H 'auth-token: test' \
  -H 'lang: EN'
```

```
{
    "categories": [
        {
            "id": "1",
            "description": "Activities"
        },
        {
            "id": "2",
            "description": "Air, helicopter and balloons"
        },
        {
            "id": "3",
            "description": "Audio guide"
        },
        {
            "id": "4",
            "description": "Cruises and Sailing"
        },
        {
            "id": "5",
            "description": "Culture and Art"
        },
        {
            "id": "6",
            "description": "Entertainment"
        },
        {
            "id": "7",
            "description": "Experiences"
        },
        {
            "id": "8",
            "description": "Family"
        },
        {
            "id": "9",
            "description": "For Children"
        },
        {
            "id": "10",
            "description": "Football"
        },
        {
            "id": "11",
            "description": "Gastronomy"
        },
        {
            "id": "12",
            "description": "Gastronomy and Nightlife"
        },
        {
            "id": "13",
            "description": "Guided Tours"
        },
        {
            "id": "14",
            "description": "Motor Sports"
        },
        {
            "id": "15",
            "description": "Nature and wildlife"
        },
        {
            "id": "16",
            "description": "Others"
        },
        {
            "id": "17",
            "description": "Outdoor Activities"
        },
        {
            "id": "18",
            "description": "Party boat"
        },
        {
            "id": "19",
            "description": "Shopping"
        },
        {
            "id": "20",
            "description": "Sightseeing"
        },
        {
            "id": "21",
            "description": "Ski, snow and ice"
        },
        {
            "id": "22",
            "description": "Spa and Wellness"
        },
        {
            "id": "23",
            "description": "Special Occasions"
        },
        {
            "id": "24",
            "description": "Sporting Events"
        },
        {
            "id": "25",
            "description": "Theme and Water Parks"
        },
        {
            "id": "26",
            "description": "Tickets"
        },
        {
            "id": "27",
            "description": "Tours"
        },
        {
            "id": "28",
            "description": "Water Sports"
        },
        {
            "id": "42",
            "description": "Private Tours"
        },
        {
            "id": "43",
            "description": "Sharing Tours"
        },
        {
            "id": "44",
            "description": "VIP"
        },
        {
            "id": "45",
            "description": "Transfers, Cars  & Guides"
        },
        {
            "id": "46",
            "description": "Meet  & Greet"
        },
        {
            "id": "47",
            "description": "Likely to Sell Out"
        },
        {
            "id": "48",
            "description": "Dorado Experiences"
        },
        {
            "id": "49",
            "description": "Theaters, shows and musicals"
        },
        {
            "id": "50",
            "description": "Cinema"
        },
        {
            "id": "51",
            "description": "Discount cheque"
        },
        {
            "id": "52",
            "description": "Religious"
        },
        {
            "id": "53",
            "description": "Diving"
        },
        {
            "id": "56",
            "description": "Adventure"
        },
        {
            "id": "59",
            "description": "Item"
        }
    ],
    "auditData": {
        "timestamp": "2026-02-27 10:20:26",
        "processTime": 49,
        "authToken": "test",
        "traceId": "L000-GET https://default.localhost/resources/ticket/categories-2026-02-27T10:20:26.435466700",
        "server": "http://localhost:30000"
    }
}
```

This operation allows you to recover the cancellation fees of a ticket reservation on the day and time that the query is made. To cancel the reservation you should use the [Cancel](#cancelticket) operation.

```
curl --location --request GET 'http://localhost/resources/booking/TST-6645/tickets/FAKE-144251907/cancellation-fee' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2025-05-26 10:05:26",
        "processTime": 73,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDgyNjA2NzEsImp0aSI6IjQ1RTAxOTI2LUNDNzAtNDE5NS1CNkFDLTQzMzM0QTQwMkY4MiJ9.H2Fq08fwHePj-V-RvlFiM_MLQ9Ictmbj6Z41msrOhrLQpTOE5y_Ao7tpBYW6Zy6nIRxqQuBZqJmcUWnJwJynmw",
        "traceId": "45E01926-CC70-4195-B6AC-43334A402F82",
        "availabilityId": 867,
        "server": "http://localhost:30000"
    },
    "cancellationFee": {
        "amount": 78.95,
        "currency": "EUR"
    }
}
```

This operation allows the cancellation of a ticket reservation. To recover cancellation fees you can use the operation.

```
curl --location --request DELETE 'http://localhost/resources/booking/TST-6645/tickets/FAKE-144251907' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2025-05-26 10:28:03",
        "processTime": 195,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDgyNjIzOTMsImp0aSI6IjREQzk3MzgxLUM2MkMtNDYwMy05QkJCLThCRjA1RTAyQ0RDMiJ9.qoKAv9s-d3eixvX9X0LZvZuIKB_p3qHpW8UODrKiU4_xzOPklZIjS4bt6N0Yk26rQxAXfxaJlpTLfmCHqVYFuw",
        "traceId": "4DC97381-C62C-4603-9BBB-8BF05E02CDC2",
        "availabilityId": 785,
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-26055",
    "externalReference": "test",
    "status": "CANCELED",
    "persons": [
        {
            "id": "TRC-26055-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        }
    ],
    "ticket": {
        "bookingReference": "FAKE-513082221",
        "status": "CANCELED",
        "name": "Cuenca's cathedral and city tour from Madrid",
        "price": {
            "amount": 315.79,
            "currency": "EUR"
        },
        "cancellationFee": {
            "amount": 78.95,
            "currency": "EUR"
        },
        "remarks": [],
        "modality": {
            "name": "deluxe",
            "duration": 1.0,
            "durationType": "HOURS",
            "onRequest": false,
            "rates": [
                {
                    "name": "Adult",
                    "quantity": 1
                }
            ]
        },
        "errorMessage": "Booking not confirmed. CANCELED"
    }
}
```

This operation allows you to update the reservation with the latest information that the reservation provider has. An example of use would be: if an ticket reservation has been closed with status 'On Request', you can use this operation to check if the status has been updated.

In the **test environment**, this operation will always change the booking status to CANCELED.

```
curl --location --request PUT 'http://localhost/resources/booking/TST-6645/tickets/FAKE-144251907' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2025-05-26 10:06:01",
        "processTime": 22,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDgyNjA2NzEsImp0aSI6IjQ1RTAxOTI2LUNDNzAtNDE5NS1CNkFDLTQzMzM0QTQwMkY4MiJ9.H2Fq08fwHePj-V-RvlFiM_MLQ9Ictmbj6Z41msrOhrLQpTOE5y_Ao7tpBYW6Zy6nIRxqQuBZqJmcUWnJwJynmw",
        "traceId": "45E01926-CC70-4195-B6AC-43334A402F82",
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-26055",
    "externalReference": "test",
    "status": "BOOKED",
    "persons": [
        {
            "id": "TRC-26055-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        }
    ],
    "ticket": {
        "bookingReference": "FAKE-675258763",
        "status": "BOOKED",
        "name": "Cuenca's cathedral and city tour from Madrid",
        "price": {
            "amount": 315.79,
            "currency": "EUR"
        },
        "cancellationPolicies": [
            {
                "date": "2025-05-25",
                "amount": {
                    "amount": 78.95,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-06",
                "amount": {
                    "amount": 157.89,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-12",
                "amount": {
                    "amount": 315.79,
                    "currency": "EUR"
                }
            }
        ],
        "remarks": [],
        "modality": {
            "name": "deluxe",
            "duration": 1.0,
            "durationType": "HOURS",
            "onRequest": false,
            "rates": [
                {
                    "name": "Adult",
                    "quantity": 1
                }
            ]
        }
    }
}
```

This operation allows you to retrieve the details of a reservation from the **bookingReference** of the reservation and the **bookingReference** of the ticket. This operation does not make any calls to the ticket providers and only retrieves the data that is in Travel Compositor.

```
curl --location --request GET 'http://localhost/resources/booking/TST-6645/tickets/FAKE-144251907' \
--header 'auth-token: eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGlhY2NvbW1vZGF0aW9uLWN1cG9ob3RlbC10ZXN0IiwiZXhwIjoxNjY4Njg2NjIzLCJqdGkiOiI1QkREQzU1OS1ERDhFLTRBMkQtQUQxMS0zN0Y0Q0UzQzk3MzIifQ.dpF6mwSEp8K4r5OM5qxUcdMe9s_G2aXmJFAzdNnpi8HBT02l5SMUFqk5AveC4emqDlAtxfXCB3biUVr4Qmvmvw' \
--header 'Accept-Encoding: gzip'
```

```
{
    "auditData": {
        "timestamp": "2025-05-26 10:04:32",
        "processTime": 56,
        "authToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZWZhdWx0LWFwaXVzZXIiLCJleHAiOjE3NDgyNjA2NzEsImp0aSI6IjQ1RTAxOTI2LUNDNzAtNDE5NS1CNkFDLTQzMzM0QTQwMkY4MiJ9.H2Fq08fwHePj-V-RvlFiM_MLQ9Ictmbj6Z41msrOhrLQpTOE5y_Ao7tpBYW6Zy6nIRxqQuBZqJmcUWnJwJynmw",
        "traceId": "45E01926-CC70-4195-B6AC-43334A402F82",
        "server": "http://localhost:30000"
    },
    "bookingReference": "TRC-26055",
    "externalReference": "test",
    "status": "BOOKED",
    "persons": [
        {
            "id": "TRC-26055-0-0",
            "name": "Test",
            "lastName": "Test",
            "requestedAge": 30,
            "courtesyTitle": "MISTER",
            "email": "test@test.com",
            "phoneCountryCode": "+34",
            "phone": "666666666"
        }
    ],
    "ticket": {
        "bookingReference": "FAKE-675258763",
        "status": "BOOKED",
        "name": "Cuenca's cathedral and city tour from Madrid",
        "price": {
            "amount": 315.79,
            "currency": "EUR"
        },
        "cancellationPolicies": [
            {
                "date": "2025-05-25",
                "amount": {
                    "amount": 78.95,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-06",
                "amount": {
                    "amount": 157.89,
                    "currency": "EUR"
                }
            },
            {
                "date": "2025-07-12",
                "amount": {
                    "amount": 315.79,
                    "currency": "EUR"
                }
            }
        ],
        "remarks": [],
        "modality": {
            "name": "deluxe",
            "duration": 1.0,
            "durationType": "HOURS",
            "onRequest": false,
            "rates": [
                {
                    "name": "Adult",
                    "quantity": 1
                }
            ]
        }
    }
}
```

## 1\. What\`s the transport data format (XML / JSON)?

Only JSON.

## 2\. Does it support gzip?

Yes, is mandatory.

## 3\. Is there any limit on the Max No. of passengers?

15 travellers.

## 4\. Does it support child or not? Age range?

Yes, it is supported. Children's age range goes from 0 till 17 years old (inclusive).

## 5\. Is there any limit on the Max No. of Adults?

15 Adults.

## 6\. Is there any limit on the Max No. of Children?

14 Children. One adult mandatory.

## 7\. Support multi-currency or not?

No.

## 8\. In the pre book step,will you provide cache rate or real rate?

Depends on connected providers. We are a supplier hub.

## 9\. Can we specify the currency in which we want the results in the availability request? If not, is it possible that we have different currencies in the different combinations?

No, always will be returned the currency whih is set up at microsite configuration and always will be the same.

## 10\. Which is the certification procees to follow?

We will ask you for the request and response of all the calls to verify that the calls are being made correctly. It shouldn't take more than a few days. Ideally, if it were possible to have a staging site to test the flow, that would be great, but it's not required.

We will also request:

\- **A booking with a 2 Adults**

\- **A booking with adults, one child and one infant.**

## 11\. Which booking statuses can be found in your system?

Our system handles statuses at two levels: **booking status** and **service status**. The booking status is calculated from the statuses of the services included in the booking.

**Service statuses:**  
\- **BOOKED** - Service confirmed successfully.  
\- **BOOK\_ERROR** - An error occurred while booking or closing the service.  
\- **CANCELED** - Canceled service.  
\- **PRICE\_ERROR** - The service was booked, but a price change was detected when closing it with the provider. The tolerance to return **BOOKED** can be configured in Microsite Settings. If no value is configured, the system default tolerance is applied.  
\- **NOT\_BOOKED** - The service was not confirmed by the provider.  
\- **RQ** - Service on request, pending provider confirmation.  
\- **PENDING\_BOOK** - The service is still in the booking process.

**Booking statuses:**  
\- **NOT\_BOOKED** - The booking is considered not booked, typically when all services ended in non-confirmed statuses such as **BOOK\_ERROR** or **NOT\_BOOKED**.  
\- **RQ** - At least one service is in **RQ**. Some providers can return **RQ** in the [Book](#bookticket) operation. TravelCApi has a scheduler that checks the status of the booking and updates it when it changes to **BOOKED**. You can check the booking status at any time right after BOOK by calling [Booking details](#bookingdetail) or [Refresh](#refresh) .  
\- **PRICE\_ERROR** - At least one service has a price change error.  
\- **PENDING\_BOOK** - At least one service is still in **PENDING\_BOOK**.  
\- **BOOKED** - All services are in **BOOKED** and there is no previous booking error condition.  
\- **BOOK\_ERROR** - Fallback status when the booking is not fully confirmed and none of the previous cases apply.  
\- **CANCELED** - Canceled booking.

## 12\. Regarding the booking flow: is there any problem if per each services request we get different valid Api token?

For the booking flow it is mandatory to use always the same token.  
For static content request there is no problem at all to use different API token.

## 13\. Do you manage Net Rates?

Yes, but it depends on the configuration of each Microsite and/or credentials connected.

## 14\. Do you manage Commissionable Rates?

Yes, but it depends on the configuration of each Microsite and/or credentials connected. The commission is defined per each credential.

## 15\. In case you manage Net and Commissionable rates, how can we identify them on the responses get?

It is not possible. The information of the rate type will be informed to you once you get your live credentials

## 16\. TravelC allows a price change tolerance at the moment of the booking confirmation. This tolerance can be configured per each Microsite. Which is the value of that tolerance?

Yes, it is something that can be configurable per each Microsite, as per % or fixed value. If it is not specified any value, then the tolerance set by default is 0,5%

## 17\. How can we get the different destination codes (destination ID)?

You can use the following API call: [getDestinations](https://online.travelcompositor.com/api/#/Web%20content/getDestinations) You will be able to get all the destination load for some specific microsite. For our test environment the microsite ID to use is this one: "apiaccommodation"

## 18\. How can we get the full list of valid codes for the node “phonecountryCode”?

We don’t have the list of the codes. This is an standard. We are working directly with the library **com.google.i18n.phonenumbers**

## 19\. Which fields are always mandatory?

There are structural data that will always be mandatory even if they are not provided in the **"requiredField"** of the **"confirm"** response.  
\- **"requestedAge"** is always mandatory.

## 20\. What are the mappings to the required field types?

"courtesyTitle" -> **TITLE**  
"name" -> **FIRST\_NAME**  
"lastName" -> **LAST\_NAME**  
"birthDate" -> **BIRTH\_DATE**  
"documentNumber" -> **DOCUMENT**  
"documentType" -> **DOCUMENT**. Document type has to be **PASSPORT** when the required type is **PASSPORT**  
"email" -> **EMAIL**  
"phoneCountryCode" -> **PHONE**  
"phone" -> **PHONE**  
"countryId" -> **COUNTRY**  
"passportExpirationDate" -> **DOCUMENT\_EXPIRY\_DATE**  
"address" -> **ADDRESS**  
"socialInsuranceNumber" -> **SOCIAL\_INSURANCE\_NUMBER**  
"billingNumber" -> **BILLING\_DOCUMENT**

This document describes the implementation and usage of a webhook designed to send notifications every time a booking is created, modified, or canceled, a client request is created or receives a new reply, or a refund is processed in TravelC system.

Endpoints can be created, tested, and deleted as needed. They can also be viewed at the microsite level, showing only that microsite's endpoints, or at the operator level, displaying all endpoints across the operator's microsites.

To set up an endpoint, log in to the back office with a user account that has the `micrositeSettings` permission. Configure the notification URL in the designated section. Before adding a new one, it is recommended to test its behavior using the “Try Notification” button. If the test is successful, proceed to add it. The endpoint will then be created and enabled.

Data -> Webhooks

![](https://online.travelcompositor.com/resources/images/api-documentation/webhook-menu.jpg) ![](https://online.travelcompositor.com/resources/images/api-documentation/booking-webhook.jpg)

Booking webhook endpoints are managed at the microsite level, with a maximum of three per microsite. Once a booking webhook endpoint is created, it can be tested or deleted using the “Options” menu. Enabling or disabling it is handled exclusively by the operations team.

![](https://online.travelcompositor.com/resources/images/api-documentation/webhook-management.jpg)

The JSON message body that will be sent with each notification follows the format:

```
{
  "timestamp": "2023-11-27T12:48:52",
  "type": "CREATED",
  "micrositeId": "fake",
  "bookingReference": "TEST-12345"
}
```

**"timestamp"**: Represents the time when the event occurred in ISO 8601 format.  
**"type"**: Can have values **"CREATED"**, **"MODIFIED"**, **"CANCELED"**, **"CLIENT\_REQUEST"**, or **"REFUND"**. A client request is a conversation associated with a booking used to manage amendments, cancellations, questions, complaints, or other requests. The **"CLIENT\_REQUEST"** event is sent when this conversation is created or receives a new reply.  
The **"REFUND"** event is sent when a refund is successfully processed for the booking.  
**"micrositeId"**: Is the ID of the microsite where the booking is generated.  
**"bookingReference"**: Is the unique identifier of the booking.

If the service is not available, up to four additional delivery attempts will be made at the following intervals: after 1 minute, 5 minutes, 15 minutes, and 30 minutes. If notification via the configured endpoint is ultimately not possible, an email will be sent to the addresses configured in the "Booking Mails" field of the microsite.

To access specific details of the booking, a method for querying bookings is provided. You can check your implementation at the following: [swagger link](https://online.travelcompositor.com/api/#/Booking/getBookings)

To enhance security, it is recommended that the specified URL includes a secret element, such as a token. For example:

```
https://my.company.com/webhook/travelc/booking-webhook/'mysecrettoken'
```

Where **'mysecrettoken'** is a unique token generated for your application. An example with a token is provided:

```
https://my.company.com/webhook/travelc/booking-webhook/985a8544-8ae1-4c33-9fb4-da0642fd583a@7463a8d5-a40b-47f6-986e-d45e2f91aca0
```

It is important to note that it is not possible to send the security token through the request header. The token must be incorporated directly into the URL, either as part of the query string or the path, to ensure proper security of the webhook. This additional measure contributes to safeguarding the authenticity and integrity of incoming requests. It is highly recommended to follow this approach when configuring the webhook URL.

The JSON message body that will be sent with each notification follows the format:

```
{
 "ideaIds": ["31668846", "31598765"]
}
```

**"ideaIds"**: It represents a list of ideas or holiday packages identifiers that have been modified, created or deleted. It can be configured in Backoffice  
**Headers**: This headers will be sent if they are configured.  
*X-Webhook-Api-Key*: Unique string that will be used to identify that it is Travel Compositor sending the request.  
*X-Webhook-Signature*: Calculated string based on the request and a code configured in the Secret field. It will use a hmac-256 algorithm to generate it.  
Example: sha256=cae9e2cc77408aa87b702a88294fb304666d999a966c9ce8cf48222b107f0463

If the service is not available, up to four additional delivery attempts will be made at the following intervals: after 1 minute, 5 minutes, 15 minutes, and 30 minutes. If notification via the configured endpoint is ultimately not possible, an email will be sent to the addresses configured in the "Booking Mails" field of the microsite.

To access specific details of the Ideas and Holiday package, a method for querying the details is provided. You can check your implementation at the following: [Ideas swagger link](https://online.travelcompositor.com/api/#/Ideas/getIdea) or [Holiday package swagger link](https://online.travelcompositor.com/api/#/Packages/getHolidayPackage)

To improve security, it is recommended to use the header parameters mentioned in the [Message Format](#ideawebhook) section.

![Project Logo](https://employees.travelcompositor.com/css/clientes/employees/images/favicon.png)