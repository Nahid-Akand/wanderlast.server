import express from 'express';
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const app = express();
const PORT = 5001;


// The Next.js app on :3000 sends the better-auth session cookie cross-origin.
// Credentialed CORS must echo the exact origin (never "*").
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())



const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("wanderlast");
const destinationCollection = db.collection("destinations");
const bookingCollection = db.collection("bookings");
const sessionCollection = db.collection("session");

/**
 * Validates the better-auth JWT the Next.js frontend sends as
 * "Authorization: Bearer <jwt>".
 *
 * The JWT is better-auth's cookie-cache token (the `session_data` cookie,
 * HS256-signed with BETTER_AUTH_SECRET), handed to client JS via the
 * frontend's /api/session-jwt route. Verification:
 *   1. HMAC-SHA256 signature over "<header>.<payload>" with BETTER_AUTH_SECRET
 *      (timing-safe) — proves the auth server issued it;
 *   2. the standard `exp` claim is still in the future;
 *   3. the session token embedded in the payload still exists unexpired in
 *      the shared `session` collection — so signout/revoke takes effect
 *      immediately instead of waiting for the JWT to expire.
 * Attaches `req.userId` on success; 401 otherwise.
 */
async function requireUser(req, res, next) {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing bearer token" });
    }

    const parts = authHeader.slice("Bearer ".length).split(".");
    if (parts.length !== 3) {
        return res.status(401).json({ message: "Malformed token" });
    }
    const [encodedHeader, encodedPayload, signature] = parts;

    const expected = createHmac("sha256", process.env.BETTER_AUTH_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url"); // JWT signatures are unpadded base64url
    const givenBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (
        givenBuf.length !== expectedBuf.length ||
        !timingSafeEqual(givenBuf, expectedBuf)
    ) {
        return res.status(401).json({ message: "Invalid token" });
    }

    let payload;
    try {
        payload = JSON.parse(
            Buffer.from(encodedPayload, "base64url").toString("utf8")
        );
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
        return res.status(401).json({ message: "Token expired" });
    }

    const sessionToken = payload.session?.token;
    if (!sessionToken) {
        return res.status(401).json({ message: "Invalid token" });
    }

    const session = await sessionCollection.findOne({ token: sessionToken });
    if (!session || new Date(session.expiresAt) <= new Date()) {
        return res.status(401).json({ message: "Session expired" });
    }

    req.userId = session.userId;
    next();
}

// Mutating routes require a logged-in user; GETs stay public.
app.post('/add-destination', requireUser, async(req,res)=>{
    const data = { ...req.body, createdBy: req.userId }

    const result = await destinationCollection.insertOne(data);
    console.log(result)
    
    res.send(result);
})

app.get('/destinations', async(req,res) =>{
    const result = await destinationCollection.find().toArray();
    res.send(result);
})

app.get('/destinations/:id', async (req,res) =>{
    const {id} = req.params

    if (!ObjectId.isValid(id)) {
        return res.status(404).send({message: "Destination not found"})
    }

    const result = await destinationCollection.findOne({_id: new ObjectId(id)})

    if (!result) {
        return res.status(404).send({message: "Destination not found"})
    }

    res.send(result);
})

app.patch('/destinations/:id', requireUser, async(req,res) =>{
    const {id} = req.params

    if (!ObjectId.isValid(id)) {
        return res.status(404).send({message: "Destination not found"})
    }

    const updatedData = req.body
    const result = await destinationCollection.updateOne({
        _id: new ObjectId(id)
    },
{$set: updatedData}
)
res.json(result);
})

app.delete('/destinations/:id', requireUser, async (req,res) =>{
    const {id} = req.params

    if (!ObjectId.isValid(id)) {
        return res.status(404).send({message: "Destination not found"})
    }

    const result = await destinationCollection.deleteOne({_id: new ObjectId(id)})

    if (result.deletedCount === 0) {
        return res.status(404).send({message: "Destination not found"})
    }

    res.send({message: "Destination deleted successfully", deletedCount: result.deletedCount});
})


// Bookings: every route requires a logged-in user. The userId always comes
// from the verified session (req.userId) — never from the request body/query.

app.post('/bookings', requireUser, async(req,res)=>{
    const { destinationId, travelers, departureDate, name, imageUrl, price } = req.body

    const guestCount = Math.max(1, Number(travelers) || 1)
    const booking = {
        bookingId: `BK-${randomBytes(4).toString('hex').toUpperCase()}`,
        userId: req.userId,
        destinationId,
        name,
        imageUrl,
        departureDate,
        price,
        travelers: guestCount,
        totalPrice: (Number(price) || 0) * guestCount,
        status: 'pending',
    }

    const result = await bookingCollection.insertOne(booking);

    res.send({ ...booking, _id: result.insertedId });
})

app.get('/bookings', requireUser, async(req,res) =>{
    const result = await bookingCollection.find({ userId: req.userId }).toArray();
    res.send(result);
})

app.patch('/bookings/:id', requireUser, async(req,res) =>{
    const {id} = req.params

    if (!ObjectId.isValid(id)) {
        return res.status(404).send({message: "Booking not found"})
    }

    const booking = await bookingCollection.findOne({_id: new ObjectId(id)})
    if (!booking || booking.userId !== req.userId) {
        return res.status(404).send({message: "Booking not found"})
    }

    const { travelers, departureDate, status } = req.body
    const guestCount = Math.max(1, Number(travelers) || booking.travelers)

    const result = await bookingCollection.updateOne({
        _id: new ObjectId(id)
    },
{$set: { travelers: guestCount, departureDate, status, totalPrice: (Number(booking.price) || 0) * guestCount }}
)
res.json(result);
})

app.delete('/bookings/:id', requireUser, async(req,res) =>{
    const {id} = req.params

    if (!ObjectId.isValid(id)) {
        return res.status(404).send({message: "Booking not found"})
    }

    const booking = await bookingCollection.findOne({_id: new ObjectId(id)})
    if (!booking || booking.userId !== req.userId) {
        return res.status(404).send({message: "Booking not found"})
    }

    const result = await bookingCollection.deleteOne({_id: new ObjectId(id)})

    res.send({message: "Booking deleted successfully", deletedCount: result.deletedCount});
})


app.get('/',(req,res)=>{
    res.send({message: 'server is running fine'})
})

app.listen(PORT,()=>{
    console.log(`server is running at portnumber ${PORT}`)
})
