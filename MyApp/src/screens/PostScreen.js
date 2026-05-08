import * as React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PostService } from '../services/postService';
import { LocationService } from '../services/locationService';
import { useAuth } from '../context/AuthContext';
import PulseLoader from '../components/PulseLoader';

const PRIMARY = '#8F00FF';
const BG = '#0A0A0A';
const CARD = '#141414';
const BORDER = '#262626';

const PostScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [type, setType] = React.useState('offer'); // buy, sell, offer, trade
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handlePost = async () => {
    if (!title || !description) {
      Alert.alert('Missing Info', 'Please provide a title and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get Location
      const coords = await LocationService.getCurrentLocation();
      const neighborhood = await LocationService.getNeighborhood(coords.latitude, coords.longitude);

      // 3. Submit Post
      await PostService.createPost(user.uid, user.name, {
        title,
        description,
        type,
        price,
        location: { ...coords, neighborhood }
      });

      Alert.alert('Success', 'Your post is live in your neighborhood!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Post Failed', 'Something went wrong while sharing your post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const TypeBadge = ({ value, label, icon }) => (
    <TouchableOpacity 
      style={[styles.typeBadge, type === value && styles.typeBadgeActive]} 
      onPress={() => setType(value)}
    >
      <Ionicons name={icon} size={18} color={type === value ? '#fff' : '#666'} />
      <Text style={[styles.typeLabel, type === value && styles.typeLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#E8E8E8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity style={styles.submitTop} onPress={handlePost} disabled={isSubmitting}>
          {isSubmitting ? (
            <PulseLoader size={20} color={PRIMARY} />
          ) : (
            <Text style={styles.submitTopText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>What are you sharing?</Text>
        <View style={styles.typeRow}>
          <TypeBadge value="offer" label="Service" icon="gift-outline" />
          <TypeBadge value="sell" label="Sell" icon="pricetag-outline" />
          <TypeBadge value="buy" label="Buy" icon="cart-outline" />
          <TypeBadge value="trade" label="Free" icon="repeat-outline" />
        </View>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={32} color="#999" />
              <Text style={styles.imagePlaceholderText}>Add a Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.inputTitle}
          placeholder="Title (e.g., Free Moving Boxes)"
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />

        <TextInput
          style={styles.inputPrice}
          placeholder="Price (Optional, e.g., 20)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.inputDescription}
          placeholder="Description (Tell your neighbors more...)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={PRIMARY} />
          <Text style={styles.infoText}>
            Your location will be shared as your neighborhood name only (geofenced).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitTopText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A9A9A',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  typeBadgeActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  typeLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  typeLabelActive: {
    color: '#fff',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CARD,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  inputTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 12,
    marginBottom: 20,
  },
  inputPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7DD97D',
    marginBottom: 20,
  },
  inputDescription: {
    fontSize: 16,
    color: '#E8E8E8',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#16131E',
    padding: 16,
    borderRadius: 12,
    marginTop: 40,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    color: '#D7A7FF',
    fontSize: 13,
    lineHeight: 18,
  },
});
