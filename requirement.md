Everfit Candidate Test Guide
Thank you for your interest in joining Everfit!
As part of our hiring process, we’d like you to complete a short assignment
to help us understand your backend development skills, problem-solving
approach, and code quality.

🧭 Purpose of the Test
This assignment is designed to assess your ability to design and implement
a backend system for a real-world use case. We will evaluate not only the
final solution, but also how you structure the project, make technical
decisions, and explain your thinking.

💻 Your Test Assignment:
Build a Metric Tracking System that supports different units.
The system should support tracking the following metric types:
● Distance: meter, centimeter, inch, feet, yard
● Temperature: °C, °F, °K
Functional requirements:
● Users should be able to add a new metric with: Date, Value, Unit
● Users should be able to retrieve:
○ A list of all metrics based on type (Distance / Temperature)
○ Data for chart drawing:
■ Use the latest metric entry per day
■ Filter by metric type
■ Filter by a specific time period (e.g. 1 month, 2 months)

● If a specific unit is provided when calling the APIs, the system should
convert and return the values in that unit.
📝 Notes & Constraints
● Authentication is not required. Please assume the user will pass a
userId, which should be used for grouping and querying data.
● The project must be implemented using Node.js.

✅ Evaluation Criteria
We will assess the assignment based on:
● Completion of all test requirements
● Code quality and structure
● Problem-solving approach
● Clarity of explanation and documentation

📩 Submission Instructions
1. Please provide a time estimation before starting the test.
When you complete the test, please:
2. Share your source code (GitHub/GitLab link preferred)
3. Include short video in English to walk through:
● System design
● Key implementation details
● Any trade-offs or assumptions made
4. Reply to all in the original test email thread to ensure the full hiring
team receives your submission.

Thank you again for your time and effort — we look forward to reviewing
your work!