import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#8F00FF';
const SURFACE = '#141414';
const SURFACE_LIGHT = '#1A1A1A';

const FeedItem = ({ item, onPress }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'sell': return '#4CAF50';
      case 'buy': return '#2196F3';
      case 'offer': return '#9C27B0';
      default: return '#757575';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(item)} activeOpacity={0.8}>
      {item.image && (
        <Image 
          source={{ uri: item.image }} 
          style={styles.image} 
          contentFit="cover"
          transition={300}
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: getTypeColor(item.type) }]}>
            <Text style={styles.badgeText}>{item.type?.toUpperCase()}</Text>
          </View>
          <View style={styles.headerRight}>
            {item.distanceStr && <Text style={styles.distanceText}>{item.distanceStr}</Text>}
            {item.price && <Text style={styles.price}>${item.price}</Text>}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

        <View style={styles.footer}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>{item.location?.neighborhood || 'Nearby'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => onPress(item)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={PRIMARY} />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default FeedItem;

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#242424',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#202020',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 10,
    color: '#CFA8FF',
    fontWeight: '600',
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F2F2F2',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#9C9C9C',
    marginLeft: 4,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '700',
    marginLeft: 6,
  },
});
