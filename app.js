const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const app = express();
const fs = require('fs')
const {JSDOM} = require("jsdom")
const contentDisposition = require('content-disposition');
const logger = require("logger").createLogger("./public/logs/runtime.log")
const router = express.Router()
const API_KEY_CHECK= "5773a83bf2dabeaaac84a8089630041ae6fd8994ba4b5db2a68e3b8bfe0767e7"
const ffmpeg = require('fluent-ffmpeg')



const cleanUp = (data) => {
  delete data.page;
  delete data.player_response;
  delete data.full;
  delete data.response;
  delete data.html5player
  delete data.videoDetails.availableCountries
  delete data.videoDetails.embed.flashUrl;
  delete data.videoDetails.embed.flashSecureUrl;
  delete data.videoDetails.embed.height;
  delete data.videoDetails.embed.width;
  delete data.videoDetails.ownerProfileUrl
  delete data.videoDetails.externalChannelId
  delete data.videoDetails.isUnlisted
  delete data.videoDetails.hasYpcMetadata
  delete data.videoDetails.category
  delete data.videoDetails.keywords;
  delete data.videoDetails.isOwnerViewing
  delete data.videoDetails.isCrawlable
  delete data.videoDetails.allowRatings
  delete data.videoDetails.channelId
  delete data.videoDetails.author.thumbnails;
  delete data.videoDetails.author.id
  delete data.videoDetails.author.user
  delete data.videoDetails.author.channel_url
  delete data.videoDetails.author.external_channel_url
  delete data.videoDetails.author.user_url
  delete data.videoDetails.author.verified
  delete data.videoDetails.author.subscriber_count
  delete data.videoDetails.isPrivate
  delete data.videoDetails.isUnpluggedCorpus
  delete data.videoDetails.isLiveContent
  delete data.videoDetails.media
  delete data.videoDetails.video_url
  delete data.videoDetails.storyboards
  delete data.videoDetails.chapters;
  return data
}


app.use(express.static('public'))
// cors error fix;
app.use(
	cors({
		origin: ["*", "https://ytmate.herokuapp.com/", "http://ytmate.herokuapp.com/"],
	}));


app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
});

app.get("/dlvid", (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const id = req.query.id;
  const xsfs = req.query.xsfs;
  const container = req.query.con
  let tag = req.query.tag;
  let temp = tag.split('-')
  tag = parseInt(temp[0])
  let reso = temp[1]
  const apikey = req.query.auth
  let hasaduio = ""

  if (tag>100) {
    hasaduio = '.NoAudio'
  } 
  if (apikey == API_KEY_CHECK){
    logger.info(`download request from ${ip} for ytvideo ${id}`)
    res.writeHead(200, {
      'Content-Disposition': contentDisposition(`${xsfs}.${reso}${hasaduio}.${container}`),
      'Content-Transfer-Encoding': 'binary',
      'Content-Type': 'application/octet-stream'
  });
    ytdl(id, { quality: tag }).pipe(res);
    logger.info('file send sucessfully')
  }
  else {
    logger.warn(`unauthorized request from ${ip}`)
    res.json({
      "statuscode": 403,
      "message": 'you are not authorized'
    })
  }
});

app.get("/info", (req, res)=> {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  let id= req.query.id;
  const {window} = new JSDOM();
  const apikey = req.query.auth
  async function getInfo() {
    logger.info('fetching from youtube api')
    let data = await ytdl.getInfo(id)
    logger.info("response cleanup started")
    let start = window.performance.now()
    data = await cleanUp(data)

    let end = window.performance.now()
    logger.info(`cleanup completed in ${end-start.toFixed(3)}s`);
    res.json(data)
}
if (apikey == API_KEY_CHECK){
  if (id === undefined) {
    res.json({ 
      status: 400,
      message: "bad request"
    })
    logger.error("No id was passed")
  }
  else {
    logger.info(`request for info of ${id} from ${ip} `);
    logger.info("execution started")
    getInfo()
  }
}else  {
  logger.warn(`unauthorized request from ${ip}`)
  res.json({
    "statuscode": 403,
    "message": 'you are not authorized'
  })
}
})

app.get("/dlaud", (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const apikey = req.query.auth;
  const bitrate = req.query.bit;
  const id = req.query.id;
  const xsfs = req.query.xsfs
  if (apikey == API_KEY_CHECK){
    logger.info(`request from ${ip} for ${id} [audio]`)
    logger.info('request send to youtube')
    const ffmpeg = require("fluent-ffmpeg");
    const stream = ytdl(id, {quality: 140});
    // console.log( contentDisposition(xsfs));
    // res.header("Content-Disposition", contentDisposition(`${xsfs}.mp3`));
    res.writeHead(200, {
      'Content-Disposition': contentDisposition(`${xsfs}.mp3`), 
      'Content-Transfer-Encoding': 'binary',
      'Content-Type': 'application/octet-stream'
  });
    logger.info('converting to mp3')
    ffmpeg(stream).format('mp3').audioBitrate(bitrate).pipe(res);
    logger.info('send')

  }
  else {
  logger.warn(`unauthorized request from ${ip}`)
  res.json({
    "statuscode": 403,
    "message": 'you are not authorized'
  })
}
}
);


app.get('/triggerviddl', async (req, res)=>{
  ytdl("qfVuRQX0ydQ", {quality: 160}).pipe(fs.createWriteStream('/tmp/audio.mp3'));  
  ytdl("qfVuRQX0ydQ", { quality: 140}).pipe(fs.createWriteStream('/tmp/video.mp4'));

  setTimeout(() => {
      
  const proc = ffmpeg("")
  .addInput(fs.createReadStream('/tmp/video.mp4'))
  .addInput('/tmp/audio.mp3')
  .format('mp4')
  .outputOptions('-movflags frag_keyframe+empty_moov')
  .on('progress', (progress)=> console.log(progress))
  .on('error', (err)=>console.log(err.message))
  .on('end', ()=>console.log('finished'))

const ffstream = proc.pipe()
ffstream.on('data', function(chunk) {
  console.log(`ffmpeg just wrote ${chunk.length} bytes`)
})
ffstream.pipe(fs.createWriteStream('public/logs/dl.mp4'))
res.send({'text': "works"})
  }, 15000)
});


app.listen(process.env.PORT || 5000, () => console.log("Server is running..."));

