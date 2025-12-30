'use client';

import { UAParser } from 'ua-parser-js';
import { useState, useEffect } from 'react';

interface SessionData {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  deviceModel: string | null;
  language: string | null;
  browserId: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  isReady: boolean;
}

export const useUserData = (): SessionData => {
  const [browser, setBrowser] = useState<string | null>(null);
  const [browserVersion, setBrowserVersion] = useState<string | null>(null);
  const [os, setOs] = useState<string | null>(null);
  const [osVersion, setOsVersion] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<string | null>(null);
  const [deviceModel, setDeviceModel] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [browserId, setBrowserId] = useState<string | null>(null); // Nuevo estado
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const parser = new UAParser(navigator.userAgent);
        const uaResult = parser.getResult();

        setBrowser(uaResult.browser.name || 'Desconocido');
        setBrowserVersion(uaResult.browser.version || 'Desconocido');
        setOs(uaResult.os.name || 'Desconocido');
        setOsVersion(uaResult.os.version || 'Desconocido');
        setDeviceType(uaResult.device.type || 'desktop');
        setDeviceModel(uaResult.device.model || 'Desconocido');
        setLanguage(navigator.language || 'Desconocido');

        // Generar o recuperar un browserId único
        let storedBrowserId = localStorage.getItem('browserId');
        if (!storedBrowserId) {
          storedBrowserId = crypto.randomUUID(); // Generar un UUID único
          localStorage.setItem('browserId', storedBrowserId);
        }
        setBrowserId(storedBrowserId);

        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setIpAddress(ipData.ip);

        const locationResponse = await fetch(`http://ip-api.com/json/${ipData.ip}`);
        const locationData = await locationResponse.json();
        setCity(locationData.city || 'Desconocido');
        setCountry(locationData.country || 'Desconocido');
        setLatitude(locationData.lat || 0);
        setLongitude(locationData.lon || 0);
      } catch {
        const parser = new UAParser(navigator.userAgent);
        const uaResult = parser.getResult();
        setBrowser(uaResult.browser.name || 'Desconocido');
        setBrowserVersion(uaResult.browser.version || 'Desconocido');
        setOs(uaResult.os.name || 'Desconocido');
        setOsVersion(uaResult.os.version || 'Desconocido');
        setDeviceType(uaResult.device.type || 'desktop');
        setDeviceModel(uaResult.device.model || 'Desconocido');
        setLanguage(navigator.language || 'Desconocido');

        let storedBrowserId = localStorage.getItem('browserId');
        if (!storedBrowserId) {
          storedBrowserId = crypto.randomUUID();
          localStorage.setItem('browserId', storedBrowserId);
        }
        setBrowserId(storedBrowserId);

        setIpAddress('unknown');
        setCity('Desconocido');
        setCountry('Desconocido');
        setLatitude(0);
        setLongitude(0);
      } finally {
        setIsReady(true);
      }
    };

    fetchData();
  }, []);

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceModel,
    language,
    browserId,
    ipAddress,
    city,
    country,
    latitude,
    longitude,
    isReady,
  };
};
