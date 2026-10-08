package com.v65.android;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class StockScannerForegroundService extends Service {
    private static final String TAG = "StockScannerService";
    public static final String CHANNEL_DAEMON_ID = "stockscanner_daemon_channel";
    public static final String CHANNEL_ALERT_ID = "stockscanner_alerts_channel";
    public static final int DAEMON_NOTIFICATION_ID = 1001;

    private static volatile boolean isRunning = false;
    private PowerManager.WakeLock wakeLock = null;
    private Handler handler;
    private Runnable scanRunnable;
    private int intervalSeconds = 30;

    public static boolean isServiceRunning() {
        return isRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannels(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "ACTION_STOP".equals(intent.getAction())) {
            stopForegroundService();
            return START_NOT_STICKY;
        }

        if (intent != null && intent.hasExtra("interval_seconds")) {
            this.intervalSeconds = Math.max(10, intent.getIntExtra("interval_seconds", 30));
        }

        isRunning = true;
        acquireWakeLock();

        boolean isBgMode = intent != null && intent.getBooleanExtra("bg_mode", false);
        String initialMsg = isBgMode
                ? "美股AI量化雷达实时运行 | 持续监控异动与反弹"
                : "美股AI雷达监控中 | 扫描周期: " + intervalSeconds + "秒";

        Notification notification = buildDaemonNotification(initialMsg);
        try {
            startForeground(DAEMON_NOTIFICATION_ID, notification);
        } catch (Exception e) {
            Log.e(TAG, "Failed to startForeground: ", e);
        }

        scheduleScanningLoop();
        return START_STICKY;
    }

    private void scheduleScanningLoop() {
        if (scanRunnable != null) {
            handler.removeCallbacks(scanRunnable);
        }

        scanRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isRunning) return;
                try {
                    // Update daemon notification with heartbeat timestamp
                    String timeStr = new java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(new java.util.Date());
                    updateDaemonNotification("🛡️ StockScanner 美股AI雷达监控中 | 上次扫描: " + timeStr);
                } catch (Exception e) {
                    Log.w(TAG, "Error in scan cycle: ", e);
                }
                if (isRunning) {
                    handler.postDelayed(this, (long) intervalSeconds * 1000);
                }
            }
        };
        handler.postDelayed(scanRunnable, (long) intervalSeconds * 1000);
    }

    private void updateDaemonNotification(String contentText) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && isRunning) {
                nm.notify(DAEMON_NOTIFICATION_ID, buildDaemonNotification(contentText));
            }
        } catch (Exception ignored) {}
    }

    private Notification buildDaemonNotification(String contentText) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction(Intent.ACTION_MAIN);
        openIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openIntent, pFlags);

        return new NotificationCompat.Builder(this, CHANNEL_DAEMON_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🛡️ StockScanner 正在后台监控中")
                .setContentText(contentText)
                .setSubText("美股量化AI守护")
                .setStyle(new NotificationCompat.BigTextStyle()
                        .setBigContentTitle("🛡️ StockScanner 美股量化AI监控守护中")
                        .bigText(contentText + "\n程序进程正在后台持续运行，实时监控美股异动与暴跌反弹机会。点击随时切回应用。"))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "StockScanner::DaemonWakeLock");
                    wakeLock.acquire();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not acquire WakeLock: ", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception ignored) {}
    }

    public static void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. Daemon Channel (Default priority, persistent status bar icon & shade)
            NotificationChannel daemonChannel = new NotificationChannel(
                    CHANNEL_DAEMON_ID,
                    "StockScanner 后台常驻守护",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            daemonChannel.setDescription("用于在后台持续保持美股扫描进程常驻运行，并在 Android 顶部状态栏显示守护状态");
            daemonChannel.setShowBadge(true);
            nm.createNotificationChannel(daemonChannel);

            // 2. High-Priority Alerts Channel (Heads-up banner, sound, vibration, like WeChat)
            NotificationChannel alertChannel = new NotificationChannel(
                    CHANNEL_ALERT_ID,
                    "StockScanner 实时预警提醒",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("美股异动与暴跌抄底即时弹窗预警，在屏幕顶部弹出浮动横幅");
            alertChannel.enableLights(true);
            alertChannel.enableVibration(true);
            alertChannel.setVibrationPattern(new long[]{0, 250, 150, 250});
            alertChannel.setShowBadge(true);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .build();
            alertChannel.setSound(soundUri, audioAttributes);

            nm.createNotificationChannel(alertChannel);
        }
    }

    /**
     * 发送微信级顶端悬浮横幅弹窗通知 (Heads-Up Floating Alert)
     */
    public static void triggerHeadsUpAlert(Context context, String title, String body, String ticker) {
        try {
            createNotificationChannels(context);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (ticker != null) {
                intent.putExtra("focus_ticker", ticker);
            }

            int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, (int) (System.currentTimeMillis() % 100000), intent, pFlags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ALERT_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setVibrate(new long[]{0, 250, 150, 250})
                    .setContentIntent(pendingIntent)
                    .setFullScreenIntent(pendingIntent, false); // Triggers heads-up popup banner

            int notifId = (int) (System.currentTimeMillis() % 100000) + 2000;
            nm.notify(notifId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to send heads-up notification: ", e);
        }
    }

    private void stopForegroundService() {
        isRunning = false;
        if (handler != null && scanRunnable != null) {
            handler.removeCallbacks(scanRunnable);
        }
        releaseWakeLock();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopForegroundService();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
