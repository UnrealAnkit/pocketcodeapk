package com.pocketcode.foregroundservice

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

const val CHANNEL_ID = "session_fg"
const val NOTIF_ID = 9001

class SessionForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Session", NotificationManager.IMPORTANCE_LOW)
            )
        }
        startForeground(NOTIF_ID, buildNotification("PocketCode · Connected"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.getStringExtra("notificationText")?.let { update(it) }
        return START_STICKY
    }

    fun update(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
    }

    private fun buildNotification(text: String) =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("PocketCode")
            .setContentText(text)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    companion object {
        fun start(ctx: Context, text: String) {
            val intent = Intent(ctx, SessionForegroundService::class.java).apply {
                putExtra("notificationText", text)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
        }

        fun update(ctx: Context, text: String) {
            val intent = Intent(ctx, SessionForegroundService::class.java).apply {
                putExtra("notificationText", text)
            }
            ctx.startService(intent)
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, SessionForegroundService::class.java))
        }
    }
}

class ForegroundServiceModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ForegroundService")

        Function("start") { text: String ->
            SessionForegroundService.start(appContext.reactContext!!, text)
        }

        Function("update") { text: String ->
            SessionForegroundService.update(appContext.reactContext!!, text)
        }

        Function("stop") {
            SessionForegroundService.stop(appContext.reactContext!!)
        }
    }
}
