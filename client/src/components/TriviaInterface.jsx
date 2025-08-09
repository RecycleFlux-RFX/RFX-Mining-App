import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function TriviaInterface() {
    const navigate = useNavigate();
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [showAnimation, setShowAnimation] = useState(false);
    const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [rewards, setRewards] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [error, setError] = useState(null);
    const [highScore, setHighScore] = useState(0);
    const [rewardTiers, setRewardTiers] = useState([]);
    const [gameState, setGameState] = useState('menu');

    const gameId = '688d176754cb10bba40ace71';
    const BASE_URL = 'http://localhost:3000';
    const MAX_QUESTIONS = 10;
    const timerRef = useRef(null);

    const scoreRewards = [
        { threshold: 500, xp: 10, tokens: 0.0001 },
        { threshold: 1000, xp: 20, tokens: 0.0002 },
        { threshold: 1500, xp: 30, tokens: 0.0003 },
        { threshold: 2000, xp: 40, tokens: 0.0004 },
        { threshold: 2500, xp: 50, tokens: 0.0005 },
    ];


    const allTriviaQuestions = [
    {
        question: "What is a blockchain?",
        options: [
            "A type of cryptocurrency wallet",
            "A decentralized, distributed ledger for recording transactions",
            "A centralized database for storing financial records",
            "A cloud storage service"
        ],
        correctAnswer: 1,
        explanation: "A blockchain is a decentralized, distributed ledger that records transactions across multiple nodes, ensuring transparency and security."
    },
    {
        question: "Who is credited with inventing Bitcoin, the first blockchain-based cryptocurrency?",
        options: ["Elon Musk", "Vitalik Buterin", "Satoshi Nakamoto", "Gavin Andresen"],
        correctAnswer: 2,
        explanation: "Satoshi Nakamoto is the pseudonymous creator of Bitcoin, introducing the first blockchain-based cryptocurrency in 2009."
    },
    {
        question: "What is the primary purpose of a blockchain's hash function?",
        options: [
            "To encrypt user passwords",
            "To compress transaction data",
            "To generate private keys",
            "To ensure data integrity and link blocks"
        ],
        correctAnswer: 3,
        explanation: "A hash function ensures data integrity by creating a unique fingerprint for each block and linking it to the next."
    },
    {
        question: "What is a 'smart contract' in blockchain technology?",
        options: [
            "A self-executing contract with terms written in code",
            "A contract stored in a centralized database",
            "A contract signed using digital signatures",
            "A legally binding paper contract"
        ],
        correctAnswer: 0,
        explanation: "Smart contracts are self-executing programs on a blockchain that automatically enforce contract terms."
    },
    {
        question: "Which consensus mechanism is commonly used by Bitcoin?",
        options: [
            "Proof of Stake",
            "Proof of Authority",
            "Proof of Work",
            "Delegated Proof of Stake"
        ],
        correctAnswer: 2,
        explanation: "Bitcoin uses Proof of Work, where miners solve complex mathematical problems to validate transactions."
    },
    {
        question: "What is a 'node' in a blockchain network?",
        options: [
            "A computer that participates in the network",
            "A type of cryptocurrency",
            "A transaction fee",
            "A smart contract template"
        ],
        correctAnswer: 0,
        explanation: "A node is a computer that maintains a copy of the blockchain and participates in its network."
    },
    {
        question: "What does 'decentralized' mean in the context of blockchain?",
        options: [
            "Stored in a single server",
            "Distributed across multiple nodes with no central control",
            "Controlled by a single authority",
            "Accessible only to administrators"
        ],
        correctAnswer: 1,
        explanation: "Decentralization means no single entity controls the blockchain; it's distributed across multiple nodes."
    },
    {
        question: "Which cryptocurrency is known for its focus on smart contracts?",
        options: ["Litecoin", "Ripple", "Bitcoin", "Ethereum"],
        correctAnswer: 3,
        explanation: "Ethereum is designed to support smart contracts, enabling programmable transactions."
    },
    {
        question: "What is a 'private key' in blockchain?",
        options: [
            "A public address for receiving funds",
            "A password for accessing a website",
            "A type of blockchain network",
            "A secret code used to sign transactions"
        ],
        correctAnswer: 3,
        explanation: "A private key is a secret code that allows users to sign transactions and prove ownership."
    },
    {
        question: "What is 'mining' in the context of blockchain?",
        options: [
            "Creating new cryptocurrencies",
            "Validating transactions and earning rewards",
            "Extracting data from a database",
            "Encrypting user data"
        ],
        correctAnswer: 1,
        explanation: "Mining involves validating blockchain transactions and earning rewards, typically in cryptocurrency."
    },
    {
        question: "What is the purpose of a blockchain's 'genesis block'?",
        options: [
            "A block for testing purposes",
            "The first block in the chain",
            "A block containing smart contracts",
            "The final block in the chain"
        ],
        correctAnswer: 1,
        explanation: "The genesis block is the first block in a blockchain, serving as its foundation."
    },
    {
        question: "Which of the following is a benefit of blockchain technology?",
        options: [
            "Transparency and immutability",
            "Slow transaction speeds",
            "High centralization",
            "Limited scalability"
        ],
        correctAnswer: 0,
        explanation: "Blockchain offers transparency and immutability, ensuring secure and unchangeable records."
    },
    {
        question: "What is a 'fork' in blockchain?",
        options: [
            "A split in the blockchain creating two paths",
            "A type of wallet",
            "A new cryptocurrency",
            "A mining tool"
        ],
        correctAnswer: 0,
        explanation: "A fork occurs when a blockchain splits into two separate chains due to protocol changes."
    },
    {
        question: "What is the main function of a 'wallet' in blockchain?",
        options: [
            "To mine cryptocurrencies",
            "To store physical cash",
            "To manage cryptographic keys and interact with the blockchain",
            "To host smart contracts"
        ],
        correctAnswer: 2,
        explanation: "A blockchain wallet manages cryptographic keys to send, receive, and track cryptocurrencies."
    },
    {
        question: "Which blockchain platform is known for its focus on privacy?",
        options: ["Cardano", "Monero", "Ethereum", "Binance Smart Chain"],
        correctAnswer: 1,
        explanation: "Monero is designed to prioritize user privacy through advanced cryptographic techniques."
    },
    {
        question: "What is a 'distributed ledger'?",
        options: [
            "A shared record of transactions across multiple nodes",
            "A centralized database",
            "A type of cryptocurrency",
            "A cloud-based storage system"
        ],
        correctAnswer: 0,
        explanation: "A distributed ledger is a shared record of transactions maintained across multiple nodes."
    },
    {
        question: "What does 'immutability' mean in blockchain?",
        options: [
            "Data cannot be altered once recorded",
            "Data is stored temporarily",
            "Data can be easily changed",
            "Data is encrypted"
        ],
        correctAnswer: 0,
        explanation: "Immutability ensures that once data is recorded on a blockchain, it cannot be altered."
    },
    {
        question: "Which of the following is NOT a blockchain use case?",
        options: [
            "Healthcare records",
            "Social media management",
            "Supply chain management",
            "Voting systems"
        ],
        correctAnswer: 1,
        explanation: "Social media management is not a typical blockchain use case, unlike the others."
    },
    {
        question: "What is a 'public blockchain'?",
        options: [
            "A blockchain with no transactions",
            "A blockchain open to anyone to participate",
            "A blockchain restricted to a single organization",
            "A blockchain for private transactions only"
        ],
        correctAnswer: 1,
        explanation: "A public blockchain allows anyone to participate, read, or write to the network."
    },
    {
        question: "What is the role of 'miners' in a blockchain network?",
        options: [
            "To validate and add transactions to the blockchain",
            "To design blockchain protocols",
            "To create smart contracts",
            "To audit wallets"
        ],
        correctAnswer: 0,
        explanation: "Miners validate transactions and add them to the blockchain, securing the network."
    },
    {
        question: "What is a 'token' in blockchain?",
        options: [
            "A type of blockchain",
            "A digital asset representing value or utility",
            "A mining reward",
            "A physical coin"
        ],
        correctAnswer: 1,
        explanation: "Tokens are digital assets on a blockchain representing value or utility."
    },
    {
        question: "Which blockchain is associated with the term 'gas fees'?",
        options: ["Ripple", "Stellar", "Ethereum", "Bitcoin"],
        correctAnswer: 2,
        explanation: "Ethereum uses gas fees to compensate for computational resources used in transactions."
    },
    {
        question: "What is a '51% attack' in blockchain?",
        options: [
            "A wallet hacking technique",
            "A type of smart contract exploit",
            "A security breach where one entity controls over half the network's computing power",
            "A virus affecting blockchain nodes"
        ],
        correctAnswer: 2,
        explanation: "A 51% attack occurs when one entity controls over half the network's computing power, compromising security."
    },
    {
        question: "What is the purpose of a 'block' in a blockchain?",
        options: [
            "To manage network nodes",
            "To group transactions for validation",
            "To store user profiles",
            "To encrypt data"
        ],
        correctAnswer: 1,
        explanation: "A block groups transactions for validation and addition to the blockchain."
    },
    {
        question: "Which technology underpins blockchain?",
        options: ["Cloud Computing", "Cryptography", "Artificial Intelligence", "Machine Learning"],
        correctAnswer: 1,
        explanation: "Cryptography secures blockchain transactions and ensures data integrity."
    },
    {
        question: "What is a 'permissioned blockchain'?",
        options: [
            "A blockchain with restricted access",
            "A blockchain for mining only",
            "A blockchain open to everyone",
            "A blockchain with no transactions"
        ],
        correctAnswer: 0,
        explanation: "A permissioned blockchain restricts access to authorized participants."
    },
    {
        question: "What is the main advantage of blockchain in supply chain management?",
        options: [
            "Lower storage costs",
            "Enhanced transparency and traceability",
            "Faster transaction speeds",
            "Simplified user interfaces"
        ],
        correctAnswer: 1,
        explanation: "Blockchain enhances transparency and traceability in supply chain management."
    },
    {
        question: "What is a 'hash'?",
        options: [
            "A smart contract",
            "A fixed-length string generated from input data",
            "A type of cryptocurrency",
            "A blockchain wallet"
        ],
        correctAnswer: 1,
        explanation: "A hash is a fixed-length string generated from data, used to ensure integrity."
    },
    {
        question: "What is the purpose of a 'nonce' in blockchain mining?",
        options: [
            "To find a valid hash for a block",
            "To manage wallet addresses",
            "To store transaction data",
            "To encrypt private keys"
        ],
        correctAnswer: 0,
        explanation: "A nonce is used in mining to find a valid hash that meets the network's difficulty."
    },
    {
        question: "Which blockchain platform is known for its focus on scalability?",
        options: ["Bitcoin", "Ripple", "Solana", "Ethereum"],
        correctAnswer: 2,
        explanation: "Solana is designed for high scalability, supporting fast and low-cost transactions."
    },
    {
        question: "What is a 'DApp'?",
        options: [
            "A decentralized application running on a blockchain",
            "A type of cryptocurrency wallet",
            "A mining tool",
            "A desktop application"
        ],
        correctAnswer: 0,
        explanation: "A DApp is a decentralized application that runs on a blockchain network."
    },
    {
        question: "What does 'PoS' stand for in blockchain?",
        options: [
            "Proof of Security",
            "Proof of Stake",
            "Proof of Service",
            "Proof of Storage"
        ],
        correctAnswer: 1,
        explanation: "Proof of Stake is a consensus mechanism where validators stake cryptocurrency."
    },
    {
        question: "Which of the following is a key feature of blockchain?",
        options: ["High latency", "Anonymity", "Centralization", "Limited transparency"],
        correctAnswer: 1,
        explanation: "Anonymity (or pseudonymity) is a key feature of many blockchain systems."
    },
    {
        question: "What is a 'block reward'?",
        options: [
            "Cryptocurrency given to miners for validating a block",
            "A penalty for invalid transactions",
            "A fee for smart contract execution",
            "A bonus for wallet users"
        ],
        correctAnswer: 0,
        explanation: "A block reward is cryptocurrency given to miners for successfully validating a block."
    },
    {
        question: "What is the main purpose of a 'public key' in blockchain?",
        options: [
            "To create smart contracts",
            "To receive funds and verify signatures",
            "To sign transactions",
            "To mine blocks"
        ],
        correctAnswer: 1,
        explanation: "A public key is used to receive funds and verify transaction signatures."
    },
    {
        question: "What is a 'consensus algorithm'?",
        options: [
            "A protocol to ensure network agreement on transactions",
            "A type of encryption",
            "A method to compress blockchain data",
            "A tool for wallet creation"
        ],
        correctAnswer: 0,
        explanation: "A consensus algorithm ensures all nodes agree on the blockchain's transaction history."
    },
    {
        question: "Which blockchain is used by the cryptocurrency XRP?",
        options: ["Cardano", "Ethereum", "Ripple", "Binance Smart Chain"],
        correctAnswer: 2,
        explanation: "XRP operates on the Ripple blockchain, designed for fast cross-border payments."
    },
    {
        question: "What is a 'sidechain'?",
        options: [
            "A type of wallet",
            "A blockchain running parallel to the main chain",
            "A smart contract platform",
            "A backup blockchain"
        ],
        correctAnswer: 1,
        explanation: "A sidechain runs parallel to the main blockchain, enabling additional functionality."
    },
    {
        question: "What is the main challenge of blockchain scalability?",
        options: [
            "Slow transaction processing",
            "Low transparency",
            "High security",
            "Limited decentralization"
        ],
        correctAnswer: 0,
        explanation: "Scalability challenges in blockchain often involve slow transaction processing speeds."
    },
    {
        question: "What is a 'hard fork'?",
        options: [
            "A permanent divergence in a blockchain",
            "A type of wallet",
            "A minor update to a blockchain",
            "A temporary network split"
        ],
        correctAnswer: 0,
        explanation: "A hard fork creates a permanent divergence in a blockchain, resulting in two chains."
    },
    {
        question: "What is a 'blockchain explorer'?",
        options: [
            "A tool to view blockchain transactions and data",
            "A smart contract editor",
            "A type of wallet",
            "A tool to mine cryptocurrencies"
        ],
        correctAnswer: 0,
        explanation: "A blockchain explorer allows users to view transactions and data on a blockchain."
    },
    {
        question: "What is the purpose of 'sharding' in blockchain?",
        options: [
            "To manage wallets",
            "To improve scalability by splitting the blockchain",
            "To create new tokens",
            "To encrypt transactions"
        ],
        correctAnswer: 1,
        explanation: "Sharding splits a blockchain into smaller parts to improve scalability and performance."
    },
    {
        question: "Which of the following is a blockchain-based identity solution?",
        options: [
            "Self-sovereign identity",
            "Two-factor authentication",
            "OAuth",
            "Single sign-on"
        ],
        correctAnswer: 0,
        explanation: "Self-sovereign identity uses blockchain to give users control over their digital identities."
    },
    {
        question: "What is a 'stablecoin'?",
        options: [
            "A type of blockchain",
            "A cryptocurrency with a fixed value pegged to an asset",
            "A cryptocurrency with no value",
            "A mining reward"
        ],
        correctAnswer: 1,
        explanation: "Stablecoins are cryptocurrencies pegged to assets like fiat currency to maintain stable value."
    },
    {
        question: "What is the main use of blockchain in healthcare?",
        options: [
            "Securing patient records",
            "Diagnosing diseases",
            "Developing medical devices",
            "Managing hospital staff"
        ],
        correctAnswer: 0,
        explanation: "Blockchain secures patient records, ensuring privacy and data integrity."
    },
    {
        question: "What is a 'gas limit' in Ethereum?",
        options: [
            "The maximum computational effort for a transaction",
            "The maximum wallet balance",
            "The maximum number of transactions per block",
            "The maximum number of nodes"
        ],
        correctAnswer: 0,
        explanation: "The gas limit in Ethereum sets the maximum computational effort for a transaction."
    },
    {
        question: "What is a 'blockchain oracle'?",
        options: [
            "A service providing external data to smart contracts",
            "A consensus mechanism",
            "A tool for mining",
            "A type of wallet"
        ],
        correctAnswer: 0,
        explanation: "Blockchain oracles provide external data to smart contracts for real-world interactions."
    },
    {
        question: "What is the primary goal of a 'layer 2' solution in blockchain?",
        options: [
            "To centralize the network",
            "To improve scalability and speed",
            "To reduce security",
            "To limit transactions"
        ],
        correctAnswer: 1,
        explanation: "Layer 2 solutions improve blockchain scalability and transaction speed."
    },
    {
        question: "Which blockchain platform is associated with NFTs?",
        options: ["Stellar", "Ripple", "Ethereum", "Bitcoin"],
        correctAnswer: 2,
        explanation: "Ethereum is the primary platform for creating and trading NFTs."
    },
    {
        question: "What does 'DeFi' stand for in blockchain?",
        options: [
            "Decentralized Finance",
            "Digital Funding",
            "Distributed File",
            "Decentralized Framework"
        ],
        correctAnswer: 0,
        explanation: "DeFi stands for Decentralized Finance, enabling financial services on blockchain."
    },
    {
        question: "What does the term 'recycling' mean?",
        options: [
            "Processing used materials into new products",
            "Composting organic waste",
            "Burning waste materials",
            "Storing waste in landfills"
        ],
        correctAnswer: 0,
        explanation: "Recycling processes used materials into new products to reduce waste."
    },
    {
        question: "Which material is most commonly recycled globally?",
        options: ["Metal", "Paper", "Plastic", "Glass"],
        correctAnswer: 1,
        explanation: "Paper is the most commonly recycled material due to its widespread use and recyclability."
    },
    {
        question: "What is the universal symbol for recycling?",
        options: [
            "A blue square",
            "Three chasing arrows in a triangle",
            "A green circle",
            "A red cross"
        ],
        correctAnswer: 1,
        explanation: "The universal recycling symbol is three chasing arrows forming a triangle."
    },
    {
        question: "Which of the following cannot typically be recycled in curbside programs?",
        options: ["Glass bottles", "Plastic bags", "Aluminum cans", "Cardboard"],
        correctAnswer: 1,
        explanation: "Plastic bags are not typically accepted in curbside recycling due to processing challenges."
    },
    {
        question: "What is 'composting'?",
        options: [
            "Decomposing organic matter into fertilizer",
            "Melting plastics",
            "Burning waste",
            "Sorting recyclables"
        ],
        correctAnswer: 0,
        explanation: "Composting decomposes organic matter into nutrient-rich fertilizer for soil."
    },
    {
        question: "What is the main benefit of recycling?",
        options: [
            "Increasing landfill use",
            "Generating more waste",
            "Reducing waste and conserving resources",
            "Increasing energy consumption"
        ],
        correctAnswer: 2,
        explanation: "Recycling reduces waste and conserves natural resources by reusing materials."
    },
    {
        question: "Which type of plastic is most commonly recycled?",
        options: [
            "PVC (Polyvinyl Chloride)",
            "PET (Polyethylene Terephthalate)",
            "LDPE (Low-Density Polyethylene)",
            "PS (Polystyrene)"
        ],
        correctAnswer: 1,
        explanation: "PET plastic is widely recycled, commonly used in bottles and containers."
    },
    {
        question: "What does the term 'upcycling' mean?",
        options: [
            "Burning waste for energy",
            "Disposing of waste in landfills",
            "Transforming by-products into higher-value products",
            "Melting plastics for reuse"
        ],
        correctAnswer: 2,
        explanation: "Upcycling transforms waste into products of higher value or quality."
    },
    {
        question: "What is the main purpose of a Materials Recovery Facility (MRF)?",
        options: [
            "To sort and process recyclables",
            "To compost organic materials",
            "To burn waste",
            "To store hazardous waste"
        ],
        correctAnswer: 0,
        explanation: "An MRF sorts and processes recyclable materials for reuse."
    },
    {
        question: "Which of the following is a renewable resource?",
        options: ["Oil", "Timber", "Coal", "Natural gas"],
        correctAnswer: 1,
        explanation: "Timber is renewable as it can be regrown, unlike fossil fuels."
    },
    {
        question: "What does the 'reduce, reuse, recycle' mantra promote?",
        options: [
            "Landfill expansion",
            "Sustainable waste management",
            "Increasing waste production",
            "Incineration"
        ],
        correctAnswer: 1,
        explanation: "The 'reduce, reuse, recycle' mantra promotes sustainable waste management."
    },
    {
        question: "What is e-waste?",
        options: [
            "Edible waste from kitchens",
            "Electronic waste, like old phones and computers",
            "Excess water waste",
            "Energy waste from factories"
        ],
        correctAnswer: 1,
        explanation: "E-waste refers to discarded electronic devices like phones and computers."
    },
    {
        question: "Which material takes the longest to decompose in a landfill?",
        options: ["Cotton", "Plastic", "Paper", "Food waste"],
        correctAnswer: 1,
        explanation: "Plastic takes hundreds of years to decompose in landfills."
    },
    {
        question: "What is the primary source of ocean plastic pollution?",
        options: ["Fishing nets", "Oil spills", "Land-based waste", "Ships"],
        correctAnswer: 2,
        explanation: "Land-based waste is the primary source of ocean plastic pollution."
    },
    {
        question: "What is the purpose of a 'bottle bill'?",
        options: [
            "To tax glass bottles",
            "To encourage recycling through deposits",
            "To ban plastic bottles",
            "To promote single-use plastics"
        ],
        correctAnswer: 1,
        explanation: "Bottle bills encourage recycling by offering deposits for returned containers."
    },
    {
        question: "Which of the following is a biodegradable material?",
        options: ["Aluminum", "Food waste", "Plastic", "Glass"],
        correctAnswer: 1,
        explanation: "Food waste is biodegradable, breaking down naturally over time."
    },
    {
        question: "What is the main challenge of recycling plastics?",
        options: [
            "Contamination and sorting difficulties",
            "Lack of plastic waste",
            "High demand for recycled plastics",
            "Low cost of recycling"
        ],
        correctAnswer: 0,
        explanation: "Contamination and sorting difficulties are major challenges in plastic recycling."
    },
    {
        question: "What does the term 'closed-loop recycling' mean?",
        options: [
            "Recycling materials into the same product",
            "Composting plastics",
            "Disposing of waste in landfills",
            "Burning waste for energy"
        ],
        correctAnswer: 0,
        explanation: "Closed-loop recycling reuses materials to create the same type of product."
    },
    {
        question: "Which of the following is NOT a benefit of recycling?",
        options: [
            "Saving energy",
            "Increasing pollution",
            "Conserving natural resources",
            "Reducing landfill waste"
        ],
        correctAnswer: 1,
        explanation: "Increasing pollution is not a benefit of recycling; the others are."
    },
    {
        question: "What is the primary material in glass recycling?",
        options: ["Paper", "Sand", "Plastic", "Metal"],
        correctAnswer: 1,
        explanation: "Sand is the primary material used in recycling glass into new products."
    },
    {
        question: "What is a common contaminant in recycling bins?",
        options: ["Cardboard", "Food residue", "Aluminum cans", "Glass bottles"],
        correctAnswer: 1,
        explanation: "Food residue contaminates recycling bins, making materials harder to process."
    },
    {
        question: "What is the purpose of a 'recycling audit'?",
        options: [
            "To burn waste",
            "To assess recycling program effectiveness",
            "To store recyclables",
            "To increase waste production"
        ],
        correctAnswer: 1,
        explanation: "A recycling audit assesses the effectiveness of recycling programs."
    },
    {
        question: "Which of the following is a common recyclable metal?",
        options: ["Wood", "Aluminum", "Rubber", "Ceramic"],
        correctAnswer: 1,
        explanation: "Aluminum is a commonly recycled metal due to its durability and value."
    },
    {
        question: "What does the term 'single-stream recycling' mean?",
        options: [
            "Mixing all recyclables in one bin",
            "Recycling only one type of material",
            "Burning waste",
            "Composting plastics"
        ],
        correctAnswer: 0,
        explanation: "Single-stream recycling allows all recyclables to be collected in one bin."
    },
    {
        question: "What is the main environmental benefit of recycling paper?",
        options: [
            "Increasing energy use",
            "Reducing deforestation",
            "Increasing water pollution",
            "Generating more waste"
        ],
        correctAnswer: 1,
        explanation: "Recycling paper reduces deforestation by reusing existing paper products."
    },
    {
        question: "What is a 'landfill'?",
        options: [
            "A site for disposing of waste",
            "A composting facility",
            "A site for recycling materials",
            "A waste-to-energy plant"
        ],
        correctAnswer: 0,
        explanation: "A landfill is a site designated for disposing of waste materials."
    },
    {
        question: "Which of the following is a recyclable plastic type?",
        options: [
            "Styrofoam",
            "HDPE (High-Density Polyethylene)",
            "Plastic bags",
            "PVC pipes"
        ],
        correctAnswer: 1,
        explanation: "HDPE is a recyclable plastic commonly used in containers and bottles."
    },
    {
        question: "What is the main goal of a circular economy?",
        options: [
            "To minimize waste and maximize resource use",
            "To expand landfills",
            "To promote single-use products",
            "To increase waste production"
        ],
        correctAnswer: 0,
        explanation: "A circular economy aims to minimize waste and maximize resource efficiency."
    },
    {
        question: "What is a common use for recycled glass?",
        options: [
            "Making new glass bottles",
            "Generating energy",
            "Creating plastic products",
            "Producing paper"
        ],
        correctAnswer: 0,
        explanation: "Recycled glass is commonly used to make new glass bottles and containers."
    },
    {
        question: "What is the primary purpose of recycling symbols on packaging?",
        options: [
            "To guide proper recycling",
            "To show manufacturing date",
            "To decorate products",
            "To indicate product price"
        ],
        correctAnswer: 0,
        explanation: "Recycling symbols guide consumers on how to properly recycle packaging."
    },
    {
        question: "What is a common barrier to effective recycling?",
        options: [
            "Excess recycling facilities",
            "Public unawareness",
            "Lack of waste",
            "Low waste production"
        ],
        correctAnswer: 1,
        explanation: "Public unawareness is a common barrier to effective recycling programs."
    },
    {
        question: "What is the main component of compost?",
        options: ["Metal", "Organic matter", "Plastic", "Glass"],
        correctAnswer: 1,
        explanation: "Organic matter, such as food scraps and yard waste, is the main component of compost."
    },
    {
        question: "Which of the following is a recyclable item?",
        options: ["Plastic wrap", "Aluminum foil", "Pizza boxes with grease", "Broken ceramics"],
        correctAnswer: 1,
        explanation: "Aluminum foil is recyclable, unlike greasy pizza boxes or plastic wrap."
    },
    {
        question: "What is the main benefit of recycling aluminum?",
        options: [
            "Increasing production costs",
            "Saving energy and reducing mining",
            "Increasing landfill waste",
            "Generating pollution"
        ],
        correctAnswer: 1,
        explanation: "Recycling aluminum saves energy and reduces the need for mining new materials."
    },
    {
        question: "What does the term 'downcycling' mean?",
        options: [
            "Recycling materials into lower-value products",
            "Composting plastics",
            "Recycling materials into higher-value products",
            "Burning waste"
        ],
        correctAnswer: 0,
        explanation: "Downcycling involves recycling materials into products of lower value."
    },
    {
        question: "What is the primary source of recycled paper?",
        options: [
            "Used paper products",
            "Metal cans",
            "Plastic bottles",
            "Glass containers"
        ],
        correctAnswer: 0,
        explanation: "Used paper products, like newspapers and cardboard, are the primary source of recycled paper."
    },
    {
        question: "What is a common recyclable item found in households?",
        options: ["Diapers", "Cardboard boxes", "Food scraps", "Plastic bags"],
        correctAnswer: 1,
        explanation: "Cardboard boxes are commonly recycled in household recycling programs."
    },
    {
        question: "What is the main purpose of a waste-to-energy plant?",
        options: [
            "To convert waste into energy",
            "To store recyclables",
            "To recycle plastics",
            "To compost organic waste"
        ],
        correctAnswer: 0,
        explanation: "Waste-to-energy plants convert waste into usable energy, such as electricity."
    },
    {
        question: "What is a common contaminant in compost bins?",
        options: ["Yard waste", "Plastic bags", "Food scraps", "Paper"],
        correctAnswer: 1,
        explanation: "Plastic bags are a common contaminant in compost bins, hindering decomposition."
    },
    {
        question: "What is the main environmental impact of landfilling?",
        options: [
            "Producing greenhouse gases",
            "Saving energy",
            "Reducing waste",
            "Conserving resources"
        ],
        correctAnswer: 0,
        explanation: "Landfills produce greenhouse gases, such as methane, as waste decomposes."
    },
    {
        question: "What is the purpose of a 'zero waste' initiative?",
        options: [
            "To burn waste",
            "To eliminate waste production",
            "To increase landfill use",
            "To promote single-use plastics"
        ],
        correctAnswer: 1,
        explanation: "Zero waste initiatives aim to eliminate waste through sustainable practices."
    },
    {
        question: "Which of the following is a recyclable electronic item?",
        options: ["Food waste", "Batteries", "Plastic bags", "Diapers"],
        correctAnswer: 1,
        explanation: "Batteries are recyclable electronics, often processed at specialized facilities."
    },
    {
        question: "What is the main challenge of recycling electronics?",
        options: [
            "High demand for e-waste",
            "Hazardous materials",
            "Lack of electronic waste",
            "Low recycling costs"
        ],
        correctAnswer: 1,
        explanation: "Hazardous materials in electronics make recycling challenging and require special handling."
    },
    {
        question: "What is the primary material in recycled aluminum cans?",
        options: ["Paper", "Aluminum", "Plastic", "Glass"],
        correctAnswer: 1,
        explanation: "Aluminum is the primary material in recycled aluminum cans."
    },
    {
        question: "What does the term 'biodegradable' mean?",
        options: [
            "Able to break down naturally",
            "Made from plastic",
            "Non-recyclable",
            "Hazardous to the environment"
        ],
        correctAnswer: 0,
        explanation: "Biodegradable materials break down naturally through biological processes."
    },
    {
        question: "What is a common use for recycled plastic?",
        options: [
            "Producing glass",
            "Making new plastic bottles",
            "Creating paper",
            "Generating energy"
        ],
        correctAnswer: 1,
        explanation: "Recycled plastic is commonly used to make new plastic bottles and containers."
    },
    {
        question: "What is the main goal of recycling education programs?",
        options: [
            "To promote proper recycling practices",
            "To burn waste",
            "To increase waste production",
            "To expand landfills"
        ],
        correctAnswer: 0,
        explanation: "Recycling education programs promote proper recycling practices to reduce waste."
    },
    {
        question: "Which of the following is a recyclable glass item?",
        options: ["Mirrors", "Glass bottles", "Light bulbs", "Window glass"],
        correctAnswer: 1,
        explanation: "Glass bottles are recyclable, unlike light bulbs or mirrors, in most programs."
    },
    {
        question: "What is the main benefit of composting?",
        options: [
            "Generating pollution",
            "Improving soil health",
            "Increasing landfill waste",
            "Increasing energy use"
        ],
        correctAnswer: 1,
        explanation: "Composting improves soil health by producing nutrient-rich fertilizer."
    },
    {
        question: "What is the primary purpose of recycling bins?",
        options: [
            "To collect recyclable materials",
            "To compost organic waste",
            "To store waste indefinitely",
            "To burn waste"
        ],
        correctAnswer: 0,
        explanation: "Recycling bins collect recyclable materials for processing and reuse."
    }
    ]    
    
    
    // Initialize the game by selecting random questions
const calculateRewards = useCallback((finalScore) => {
        let earnedXp = 0;
        let earnedTokens = 0;
        const achievedTiers = [];

        for (const tier of scoreRewards) {
            if (finalScore >= tier.threshold) {
                earnedXp += tier.xp;
                earnedTokens += tier.tokens;
                achievedTiers.push({
                    threshold: tier.threshold,
                    xp: tier.xp,
                    tokens: tier.tokens,
                });
            }
        }

        const baseXp = Math.floor(finalScore / 20);
        earnedXp += baseXp;

        if (streak >= 5) {
            earnedXp += 10;
            achievedTiers.push({
                description: "5+ Streak Bonus",
                xp: 10,
                tokens: 0,
            });
        }

        return { xpEarned: earnedXp, tokensEarned: earnedTokens, achievedTiers };
    }, [streak]);

    const startGame = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Please log in to play the game');
            }

            if (!/^[0-9a-fA-F]{24}$/.test(gameId)) {
                throw new Error('Invalid game ID format');
            }

            const response = await axios.post(
                `${BASE_URL}/games/start`,
                {
                    gameId,
                    title: 'Blockchain & Recycling Trivia'
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    validateStatus: (status) => status < 500
                }
            );

            if (response.data.success === false) {
                throw new Error(response.data.message || 'Failed to start game');
            }

            const shuffled = [...allTriviaQuestions].sort(() => 0.5 - Math.random());
            setSelectedQuestions(shuffled.slice(0, MAX_QUESTIONS));
            setGameState('playing');
            setScore(0);
            setStreak(0);
            setTimeLeft(15);
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowResult(false);
            setShowAnimation(false);
            setQuestionsAnswered(0);
            setRewards([]);
            setRewardTiers([]);
            setGameCompleted(false);
            setHighScore(response.data.highScore || 0);
            setError(null);

        } catch (error) {
            console.error('Error starting game:', error);
            let errorMessage = error.response?.data?.message || error.message || 'Failed to start game';

            if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
                errorMessage = 'Session expired. Please log in again.';
                localStorage.removeItem('authToken');
                navigate('/dashboard');
            } else if (errorMessage.includes('ObjectId') || errorMessage.includes('Cast to ObjectId')) {
                errorMessage = 'Game configuration error. Please try another game.';
            } else if (errorMessage.includes('locked')) {
                errorMessage = 'This game is currently unavailable.';
            } else if (errorMessage.includes('daily limit')) {
                errorMessage = 'You\'ve reached your daily play limit for this game.';
            }

            setError(errorMessage);
        }
    };

    const submitScore = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication missing');
            }

            const { xpEarned, tokensEarned, achievedTiers } = calculateRewards(score);
            const achievements = streak >= 5 ? ['Trivia Master'] : [];

            const response = await axios.post(
                `${BASE_URL}/games/complete`,
                {
                    gameId,
                    score,
                    xpEarned,
                    tokensEarned,
                    achievements,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setHighScore(response.data.newHighScore || score);
            setRewardTiers(achievedTiers);
            setGameCompleted(true);
        } catch (error) {
            console.error('Error submitting score:', error);
            setError('Failed to submit score');
        }
    };

    const handleAnswerSelect = useCallback((optionIndex) => {
        if (!showResult && questionsAnswered < MAX_QUESTIONS && selectedQuestions.length > 0) {
            const currentQuestionData = selectedQuestions[currentQuestion];
            setSelectedAnswer(optionIndex);
            const correct = optionIndex === currentQuestionData.correctAnswer;
            setIsAnswerCorrect(correct);
            setShowResult(true);
            setQuestionsAnswered(prev => prev + 1);

            if (correct) {
                const timeBonus = Math.floor(timeLeft / 3);
                const newScore = score + 100 + timeBonus;
                const newStreak = streak + 1;

                setScore(newScore);
                setStreak(newStreak);

                if (newStreak % 3 === 0) {
                    const streakReward = {
                        type: 'streak',
                        amount: newStreak * 10,
                        message: `${newStreak}-question streak!`
                    };
                    setRewards([...rewards, streakReward]);
                }
            } else {
                setStreak(0);
            }

            setShowAnimation(true);

            setTimeout(() => {
                setShowAnimation(false);
                setTimeLeft(15);

                if (currentQuestion < selectedQuestions.length - 1) {
                    setTimeout(() => {
                        setCurrentQuestion(prev => prev + 1);
                        setSelectedAnswer(null);
                        setShowResult(false);
                    }, 300);
                } else {
                    submitScore();
                }
            }, 2000);
        }
    }, [currentQuestion, questionsAnswered, score, showResult, streak, timeLeft, selectedQuestions, rewards]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timerRef.current);
        } else if (timeLeft === 0 && gameState === 'playing') {
            handleAnswerSelect(-1);
        }
    }, [timeLeft, gameState, handleAnswerSelect]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handleRestart = async () => {
        await startGame();
    };

    const handleExit = () => {
        navigate('/games');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-500 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/games')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'menu') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">🧠 Trivia Challenge</h1>
                    <p className="text-gray-600 mb-6">Test your knowledge of blockchain and recycling!</p>
                    <div className="mb-6">
                        <p className="text-sm text-gray-500">High Score</p>
                        <p className="text-2xl font-bold text-green-600">{highScore}</p>
                    </div>
                    <button
                        onClick={startGame}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-colors"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        );
    }

    if (gameCompleted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">Game Over!</h1>
                        <p className="text-gray-600">Your trivia results</p>
                    </div>

                    <div className="mb-8 space-y-4">
                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
                            <div className="text-3xl font-bold text-purple-600">{score}</div>
                            <div className="text-sm text-gray-600">Final Score</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-gray-700">{streak}x</div>
                                <div className="text-xs text-gray-500">Highest Streak</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-gray-700">{highScore}</div>
                                <div className="text-xs text-gray-500">High Score</div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                            <h3 className="font-bold text-lg text-blue-800 mb-2">Rewards Earned</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-700">XP Earned:</span>
                                    <span className="font-bold text-blue-600">
                                        {rewardTiers.reduce((sum, tier) => sum + tier.xp, 0)} XP
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Tokens Earned:</span>
                                    <span className="font-bold text-green-600">
                                        RFX {rewardTiers.reduce((sum, tier) => sum + tier.tokens, 0).toFixed(6)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {rewardTiers.length > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4">
                                <h3 className="font-bold text-lg text-green-800 mb-2">Achievements</h3>
                                <ul className="space-y-1 text-sm">
                                    {rewardTiers.map((tier, index) => (
                                        <li key={index} className="flex justify-between">
                                            <span>
                                                {tier.threshold ? `Score ${tier.threshold}+` : tier.description}
                                            </span>
                                            <span className="font-medium">
                                                +{tier.xp} XP{tier.tokens > 0 ? ` +RFX ${tier.tokens.toFixed(6)}` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={handleRestart}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            Play Again
                        </button>
                        <button
                            onClick={handleExit}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            Back to Games
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestionData = selectedQuestions[currentQuestion];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
                {showAnimation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`animate-bounce ${isAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            <div className="text-8xl mb-4 text-center">
                                {isAnswerCorrect ? '🎉' : '😞'}
                            </div>
                            <div className="text-3xl font-bold text-white text-center">
                                {isAnswerCorrect ? 'Correct!' : timeLeft === 0 ? 'Time Up!' : 'Wrong!'}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Blockchain & Recycling Trivia</h1>
                        <div className="text-sm text-gray-600">
                            Question {currentQuestion + 1} of {MAX_QUESTIONS}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 px-3 py-1 rounded-full">
                            <span className="text-blue-800 font-semibold">Score: {score}</span>
                        </div>
                        {streak > 0 && (
                            <div className="bg-yellow-100 px-3 py-1 rounded-full">
                                <span className="text-yellow-800 font-semibold">Streak: {streak}</span>
                            </div>
                        )}
                        <div className={`text-xl font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
                            {timeLeft}s
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 leading-relaxed">
                        {currentQuestionData?.question}
                    </h2>
                </div>

                <div className="space-y-3 mb-8">
                    {currentQuestionData?.options.map((option, index) => {
                        let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all duration-200 font-medium";

                        if (!showResult) {
                            buttonClass += selectedAnswer === index
                                ? " border-blue-500 bg-blue-50 text-blue-700"
                                : " border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 text-gray-700";
                        } else {
                            if (index === currentQuestionData.correctAnswer) {
                                buttonClass += " border-green-500 bg-green-100 text-green-800";
                            } else if (index === selectedAnswer && selectedAnswer !== currentQuestionData.correctAnswer) {
                                buttonClass += " border-red-500 bg-red-100 text-red-800";
                            } else {
                                buttonClass += " border-gray-200 bg-gray-50 text-gray-500";
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={buttonClass}
                                disabled={showResult}
                            >
                                <div className="flex items-center">
                                    <span className="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center mr-3 text-sm font-bold">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span>{option}</span>
                                    {showResult && index === currentQuestionData.correctAnswer && (
                                        <span className="ml-auto text-green-600">✓</span>
                                    )}
                                    {showResult && index === selectedAnswer && selectedAnswer !== currentQuestionData.correctAnswer && (
                                        <span className="ml-auto text-red-600">✗</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {showResult && (
                    <div className={`p-4 rounded-xl mb-6 ${isAnswerCorrect ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                        <div className="flex items-center mb-2">
                            <span className={`text-2xl mr-2 ${isAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {isAnswerCorrect ? '🎉' : '😔'}
                            </span>
                            <span className={`font-bold text-lg ${isAnswerCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {isAnswerCorrect ? 'Correct!' : timeLeft === 0 ? 'Time Expired!' : 'Incorrect!'}
                            </span>
                            {isAnswerCorrect && timeLeft > 0 && (
                                <span className="ml-auto bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                                    +{Math.floor(timeLeft / 3)} time bonus
                                </span>
                            )}
                        </div>
                        <p className={`text-sm ${isAnswerCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {currentQuestionData.explanation}
                        </p>
                    </div>
                )}

                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={handleExit}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                    >
                        Exit Game
                    </button>
                    <div className="text-sm text-gray-600">
                        {questionsAnswered} of {MAX_QUESTIONS} answered
                    </div>
                </div>
            </div>
        </div>
    );
}