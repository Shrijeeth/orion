require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const upload = multer();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
	res.setHeader("Cache-Control", "no-store");
	next();
});

const port = 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { scrapeWebpages } = require("./scraper");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const threshold = 20;

let flush = false;
let currentBaseURL = "";

async function gemini(prompt) {
	const result = await model.generateContent(prompt);
	const response = await result.response;
	return response.text();
}

const getBaseUrl = (url, levels = 0) => {
	try {
		const parsedUrl = new URL(url);
		const pathSegments = parsedUrl.pathname
			.split("/")
			.filter((segment) => segment);
		const basePath = pathSegments.slice(0, levels).join("/");
		return `${parsedUrl.protocol}//${parsedUrl.hostname}${
			basePath ? "/" + basePath : ""
		}`;
	} catch (error) {
		console.error("Invalid URL:", error);
		return null;
	}
};

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.post("/search", upload.none(), async (req, res) => {
	console.log("Request received");

	const userPrompt = req.body.prompt;
	console.log(`prompt: ${userPrompt}`);

	const urlTab = req.body.urlTab;
	console.log(`urlTab: ${urlTab}`);

	const urlUser = req.body.urlUser;
	console.log(`urlUser: ${urlUser}`);

	let baseUrl = "";
	if (urlUser !== "") {
		baseUrl = urlUser;
	} else {
		baseUrl = getBaseUrl(urlTab, 0);
	}
	console.log(`baseUrl: ${baseUrl}`);

	if (currentBaseURL !== baseUrl) {
		currentBaseURL = baseUrl;
		flush = true;
		console.log(`currentBaseURL: ${currentBaseURL}`);
	} else {
		flush = false;
	}

	const { scrapedContent, visitedURLsArray } = await scrapeWebpages(
		baseUrl,
		threshold,
		flush
	);

	// console.log("Visited URLs:");
	// visitedURLsArray.forEach((url) => {
	// 	console.log(`URL: ${url}`);
	// });

	// console.log(`visitedURLsArray: ${visitedURLsArray}`);
	// console.log(`scrapedContent: ${scrapedContent}`);

	let totalChars = 0;
	let allText = "";
	Object.keys(scrapedContent).forEach((key) => {
		console.log(`Key: ${key}, Value: ${scrapedContent[key].substring(0, 5)}`);
		totalChars += scrapedContent[key].length;
		allText += scrapedContent[key] + "\n\n\n";
	});

	// console.log(`totalChars: ${totalChars}`);

	let prompt = `
	You are a browser asistant who answers queries from users and also an expert web scraper. You are given the html content of multiple pages combined as context, along with a user query.
	Answer the user query based on the context. Don't mention that you are an expert web scraper, or anything related to web scraping.
	Answer with the proper context without encouraging the user to perform any other actions. 
	If the answer to the question doesnt seem to be in the information given, return "Sorry, I could not find that information among the searched webpages.".
	Talk as if you are a third person who reads the context and answers the user query, and don't endorse any of the context. Don't talk as if you are affiliated with the context.
	Return the answer with properly formatted markdown syntax. Don't be too verbose.

	User query:
	${userPrompt}

	HTML context:
	${allText}`;

	try {
		const geminiResponse = await gemini(prompt);
		res.status(200).json({
			status: "success",
			statusCode: 200,
			result: { message: geminiResponse },
		});
	} catch (error) {
		console.error("Error processing request:", error);
		res.status(500).json({
			status: "error",
			statusCode: 500,
			result: { message: "An error occurred while processing your request" },
		});
	}

	// ---------------------------------------------

	// console.log("https://picnichealth.com/picnicai");
	// console.log(scrapedContent["https://picnichealth.com/picnicai"]);

	// res.json({
	// 	status: "success",
	// 	statusCode: 200,
	// 	result: { message: "testing" },
	// });
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});