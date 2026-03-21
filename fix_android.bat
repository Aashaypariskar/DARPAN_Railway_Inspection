@echo off
echo [FIX] Stopping Gradle Daemons...
call gradlew --stop

echo [FIX] Cleaning Project...
call gradlew clean

echo [FIX] Removing cached .gradle and build directories...
if exist .gradle (
    echo Removing .gradle...
    rmdir /s /q .gradle
)
if exist build (
    echo Removing build...
    rmdir /s /q build
)
if exist app\build (
    echo Removing app\build...
    rmdir /s /q app\build
)

echo [FIX] Android build cache cleared. Run 'gradlew assembleDebug' or your build command next.
