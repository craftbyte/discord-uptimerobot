const express = require('express'),
	request = require('request'),
	dotenv = require('dotenv'),
	Discord = require('discord.js')
	moment = require('moment');

dotenv.config()
var hook = new Discord.WebhookClient(process.env.DISCORD_WEBHOOK_ID, process.env.DISCORD_WEBHOOK_TOKEN);
var app = express();
process.on('unhandledRejection', console.error);

hook.edit('FRI Status Hook', process.env.DISCORD_BOT_AVATAR_URL)

var getMonitorStats = function (monitorID, callback) {
	var options = {
		method: 'POST',
		url: 'https://api.uptimerobot.com/v2/getMonitors',
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/x-www-form-urlencoded'
		},
		form: {
			api_key: process.env.UPTIME_ROBOT_API_KEY,
			format: 'json',
			logs: '1',
			monitors: monitorID,
			custom_uptime_ratios: 7
		}
	};
	 
	request(options, (error, response, body) => {
		if (error) throw new Error(error);
	 
		callback(JSON.parse(body));
	});
}

app.get('/webhook', (req, res) => {
	const monitorName = req.query.monitorFriendlyName;
	var embed = new Discord.RichEmbed();
	embed.setTimestamp(moment.unix(req.query.alertDateTime).utc().toDate())
	embed.setFooter("FRI Status Bot")
	if (req.query.alertType == 1) {
		getMonitorStats(req.query.monitorID, (body) => {
			var lastDown;
			const monitor = body.monitors[0];
			for (let log of monitor.logs) {
				if (log.type == 1 && log.duration > 50) {
					lastDown = moment.unix(log.datetime);
					break
				}
			}
			embed.setTitle(monitorName + " is DOWN")
			embed.setColor('RED')
			embed.setThumbnail(process.env.DISCORD_BOT_THUMB_URL_DOWN);
			embed.addField("Last Downtime", lastDown ? lastDown.format("dddd, MMMM Do YYYY \\a\\t H:mm") : 'Never')
			embed.addField("Uptime in last 7 days", monitor.custom_uptime_ratio+"%")
			hook.send({
				username: monitorName,
				embeds: [embed]
			})
		})
	} else if (req.query.alertType == 2) {
		embed.setTitle(monitorName + " is UP")
		embed.setColor('GREEN')
		embed.setThumbnail(process.env.DISCORD_BOT_THUMB_URL_UP);
		embed.addField("Downtime Lasted for", req.query.alertFriendlyDuration)
		hook.send({
			username: monitorName,
			embeds: [embed]
		})
	}
	res.end();
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log('listening on', port)
})