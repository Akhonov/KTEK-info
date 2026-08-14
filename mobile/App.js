import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_PORT = Constants.expoConfig?.extra?.ktekWebPort || 8000;
const WEB_PATH = Constants.expoConfig?.extra?.ktekWebPath || '/index.html';
const ENV_WEB_URL = process.env.EXPO_PUBLIC_KTEK_WEB_URL;

function extractExpoHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.platform?.hostUri || '';
  const withoutProtocol = String(hostUri).replace(/^\w+:\/\//, '');

  if (withoutProtocol.startsWith('[')) {
    return withoutProtocol.slice(1, withoutProtocol.indexOf(']'));
  }

  return withoutProtocol.split(':')[0];
}

function buildDefaultUrl() {
  if (ENV_WEB_URL) return ENV_WEB_URL;
  const host = extractExpoHost();
  return host ? `http://${host}:${WEB_PORT}${WEB_PATH}` : `http://192.168.1.100:${WEB_PORT}${WEB_PATH}`;
}

function normalizeServerUrl(value) {
  let normalized = String(value || '').trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `http://${normalized}`;

  try {
    const parsed = new URL(normalized);
    if (!parsed.pathname || parsed.pathname === '/') parsed.pathname = WEB_PATH;
    return parsed.toString();
  } catch {
    return normalized;
  }
}

function ConnectionScreen({ initialUrl, errorMessage, onConnect }) {
  const [value, setValue] = useState(initialUrl);

  useEffect(() => {
    setValue(initialUrl);
  }, [initialUrl]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.connectionScreen}
    >
      <View style={styles.connectionGlowOne} />
      <View style={styles.connectionGlowTwo} />
      <View style={styles.connectionCard}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>К</Text>
        </View>
        <Text style={styles.connectionEyebrow}>КТЭК · МОБИЛЬНЫЙ ДОСТУП</Text>
        <Text style={styles.connectionTitle}>Тепловые сети Костаная</Text>
        <Text style={styles.connectionText}>
          Подключитесь к компьютеру, на котором запущены карта и Expo.
        </Text>

        <Text style={styles.inputLabel}>Адрес веб-сервера</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={setValue}
          onSubmitEditing={() => onConnect(value)}
          placeholder="http://192.168.1.10:8000/index.html"
          placeholderTextColor="#60747a"
          returnKeyType="go"
          selectTextOnFocus
          style={styles.input}
          value={value}
        />

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => onConnect(value)}
          style={({ pressed }) => [styles.connectButton, pressed && styles.connectButtonPressed]}
        >
          <Text style={styles.connectButtonText}>Подключиться</Text>
        </Pressable>

        <Text style={styles.connectionHint}>
          Телефон и компьютер должны находиться в одной Wi-Fi сети.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function LoadingScreen({ url }) {
  return (
    <View style={styles.loadingScreen}>
      <View style={styles.loadingLogo}>
        <Text style={styles.loadingLogoText}>КТЭК</Text>
      </View>
      <ActivityIndicator color="#f06b2c" size="large" />
      <Text style={styles.loadingTitle}>Подключение к диспетчерской карте</Text>
      <Text numberOfLines={2} style={styles.loadingUrl}>{url}</Text>
    </View>
  );
}

export default function App() {
  const webViewRef = useRef(null);
  const defaultUrl = useMemo(buildDefaultUrl, []);
  const [serverUrl, setServerUrl] = useState(defaultUrl);
  const [status, setStatus] = useState('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  const checkServer = useCallback(async (candidate) => {
    const normalizedUrl = normalizeServerUrl(candidate);
    setServerUrl(normalizedUrl);
    setStatus('checking');
    setErrorMessage('');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const response = await fetch(normalizedUrl, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus('connected');
    } catch (error) {
      const detail = error?.name === 'AbortError'
        ? 'Сервер не ответил за 9 секунд.'
        : 'Не удалось открыть карту по указанному адресу.';
      setErrorMessage(`${detail} Проверьте Wi-Fi, IP-адрес и запущен ли start-expo.ps1.`);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    checkServer(defaultUrl);
  }, [checkServer, defaultUrl]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'connected' && canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [canGoBack, status]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#101d21" style="light" />

      {status === 'checking' ? <LoadingScreen url={serverUrl} /> : null}

      {status === 'error' ? (
        <ConnectionScreen
          errorMessage={errorMessage}
          initialUrl={serverUrl}
          onConnect={checkServer}
        />
      ) : null}

      {status === 'connected' ? (
        <View style={styles.webContainer}>
          <WebView
            ref={webViewRef}
            allowFileAccess
            allowsBackForwardNavigationGestures
            cacheEnabled
            domStorageEnabled
            javaScriptCanOpenWindowsAutomatically={false}
            javaScriptEnabled
            mixedContentMode="always"
            onError={() => {
              setErrorMessage('Соединение с картой потеряно. Проверьте сервер на компьютере.');
              setStatus('error');
            }}
            onHttpError={(event) => {
              setErrorMessage(`Сервер карты вернул ошибку HTTP ${event.nativeEvent.statusCode}.`);
              setStatus('error');
            }}
            onNavigationStateChange={(navigation) => setCanGoBack(navigation.canGoBack)}
            originWhitelist={['http://*', 'https://*']}
            pullToRefreshEnabled
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            source={{ uri: serverUrl }}
            startInLoadingState
            thirdPartyCookiesEnabled
          />
          <Pressable
            accessibilityLabel="Переподключиться к карте"
            accessibilityRole="button"
            onLongPress={() => setStatus('error')}
            onPress={() => webViewRef.current?.reload()}
            style={({ pressed }) => [styles.reloadButton, pressed && styles.reloadButtonPressed]}
          >
            <Text style={styles.reloadButtonText}>↻</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
    backgroundColor: '#101d21',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#e8edf0',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#101d21',
  },
  loadingLogo: {
    marginBottom: 28,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#34474c',
    borderRadius: 12,
    backgroundColor: '#18282d',
  },
  loadingLogoText: {
    color: '#f2763f',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  loadingTitle: {
    marginTop: 18,
    color: '#eef4f4',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingUrl: {
    marginTop: 8,
    color: '#72868b',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  connectionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 20,
    backgroundColor: '#0e1a1e',
  },
  connectionGlowOne: {
    position: 'absolute',
    top: -90,
    right: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(240, 107, 44, 0.10)',
  },
  connectionGlowTwo: {
    position: 'absolute',
    bottom: -130,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(41, 146, 132, 0.10)',
  },
  connectionCard: {
    width: '100%',
    maxWidth: 430,
    padding: 24,
    borderWidth: 1,
    borderColor: '#304248',
    borderRadius: 18,
    backgroundColor: '#142327',
  },
  logoMark: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderRadius: 13,
    backgroundColor: '#e86127',
  },
  logoMarkText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  connectionEyebrow: {
    color: '#e87947',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  connectionTitle: {
    marginTop: 9,
    color: '#f5f8f8',
    fontSize: 24,
    fontWeight: '800',
  },
  connectionText: {
    marginTop: 10,
    color: '#8fa1a5',
    fontSize: 12,
    lineHeight: 19,
  },
  inputLabel: {
    marginTop: 24,
    marginBottom: 7,
    color: '#c7d1d3',
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    height: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#3b5055',
    borderRadius: 9,
    backgroundColor: '#192b30',
    color: '#fff',
    fontSize: 12,
  },
  errorBox: {
    marginTop: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: '#663c36',
    borderRadius: 8,
    backgroundColor: '#2c2020',
  },
  errorText: {
    color: '#ffb8aa',
    fontSize: 10,
    lineHeight: 15,
  },
  connectButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    borderRadius: 9,
    backgroundColor: '#df622a',
  },
  connectButtonPressed: {
    backgroundColor: '#bd4d1c',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  connectionHint: {
    marginTop: 15,
    color: '#687c81',
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
  },
  reloadButton: {
    position: 'absolute',
    left: 12,
    bottom: 13,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.28)',
    borderRadius: 18,
    backgroundColor: 'rgba(17, 29, 33, .80)',
  },
  reloadButtonPressed: {
    backgroundColor: '#df622a',
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 23,
  },
});
