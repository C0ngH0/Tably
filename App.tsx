import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { buildImportedReceiptData, extractReceipt } from "./services/receiptExtraction";
import type { ExtractedReceipt } from "./types/receipt";
import type {
  Person,
  ReceiptItem,
  SplitMode,
  SplitSession,
  TipMode,
} from "./types/split";
import { TIP_PERCENT_PRESETS } from "./types/split";
import {
  calculateEvenSplit,
  calculateHybridSplit,
  calculateItemizedSplit,
  calculateItemsSubtotal,
  formatSessionShareText,
  formatTipSelectionLabel,
  resolveTipAmount,
  validateItemFields,
  validateParticipantName,
  validateSplitInput,
} from "./utils/splitCalculator";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseAmount(value: string) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

const MODE_OPTIONS: { mode: SplitMode; label: string; description: string }[] = [
  {
    mode: "even",
    label: "Even Split",
    description: "Split one final total equally.",
  },
  {
    mode: "itemized",
    label: "Itemized Split",
    description: "Assign each item to one person.",
  },
  {
    mode: "hybrid",
    label: "Hybrid Split",
    description: "Share items across multiple people.",
  },
];

const INITIAL_MODE: SplitMode = "even";

const RECEIPT_IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  quality: 0.8,
};

const INITIAL_TIP_PERCENT = 18;

export default function App() {
  const [mode, setMode] = useState<SplitMode>(INITIAL_MODE);
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [billTotal, setBillTotal] = useState("");
  const [tax, setTax] = useState("");
  const [tipMode, setTipMode] = useState<TipMode>("percentage");
  const [tipPercent, setTipPercent] = useState(INITIAL_TIP_PERCENT);
  const [customTip, setCustomTip] = useState("");
  const [session, setSession] = useState<SplitSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);
  const [extractedReceipt, setExtractedReceipt] =
    useState<ExtractedReceipt | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const receiptItemsSectionY = useRef(0);

  const clearExtraction = () => {
    setExtractedReceipt(null);
    setIsExtracting(false);
    setImportMessage(null);
  };

  const clearResults = () => {
    setSession(null);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingPersonId(null);
    setEditingPersonName("");
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemPrice("");
  };

  const changeMode = (nextMode: SplitMode) => {
    setMode(nextMode);
    cancelEditing();
    clearResults();
  };

  const resetSplit = () => {
    setMode(INITIAL_MODE);
    setPeople([]);
    setItems([]);
    setPersonName("");
    setItemName("");
    setItemPrice("");
    setBillTotal("");
    setTax("");
    setTipMode("percentage");
    setTipPercent(INITIAL_TIP_PERCENT);
    setCustomTip("");
    setReceiptImageUri(null);
    clearExtraction();
    setImportMessage(null);
    cancelEditing();
    clearResults();
  };

  const handleReceiptImageSelected = (uri: string) => {
    setReceiptImageUri(uri);
    clearExtraction();
  };

  const pickReceiptFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Photo library access needed",
        "Allow photo library access to attach a receipt image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync(
      RECEIPT_IMAGE_OPTIONS,
    );

    if (!result.canceled && result.assets[0]) {
      handleReceiptImageSelected(result.assets[0].uri);
    }
  };

  const takeReceiptPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        "Allow camera access to photograph your receipt.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync(RECEIPT_IMAGE_OPTIONS);

    if (!result.canceled && result.assets[0]) {
      handleReceiptImageSelected(result.assets[0].uri);
    }
  };

  const removeReceiptImage = () => {
    setReceiptImageUri(null);
    clearExtraction();
  };

  const handleExtractReceipt = async () => {
    if (!receiptImageUri || isExtracting) {
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const data = await extractReceipt(receiptImageUri);
      setExtractedReceipt(data);
    } catch (error) {
      setExtractedReceipt(null);
      setError(
        error instanceof Error
          ? error.message
          : "Could not extract receipt data. Try again or enter items manually.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const useExtractedReceipt = () => {
    if (!extractedReceipt) {
      return;
    }

    if (extractedReceipt.items.length === 0) {
      setError("No items were found in the extracted receipt.");
      return;
    }

    const imported = buildImportedReceiptData(extractedReceipt, createId);

    setMode("itemized");
    setItems(imported.items);
    setTax(imported.tax);
    setBillTotal(imported.billTotal);
    setItemName("");
    setItemPrice("");
    cancelEditing();
    clearResults();
    setError(null);
    setImportMessage(
      `Imported ${imported.items.length} items. Assign each one to a participant.`,
    );
  };

  const itemsSubtotal = calculateItemsSubtotal(items);
  const currentTipAmount = resolveTipAmount(
    itemsSubtotal,
    tipMode,
    tipPercent,
    parseAmount(customTip),
  );
  const extractedTipAmount = extractedReceipt
    ? resolveTipAmount(
        extractedReceipt.subtotal,
        tipMode,
        tipPercent,
        parseAmount(customTip),
      )
    : 0;

  const selectTipPreset = (percent: number) => {
    setTipMode("percentage");
    setTipPercent(percent);
    clearResults();
  };

  const selectCustomTipMode = () => {
    setTipMode("fixed");
    clearResults();
  };

  const addPerson = () => {
    const trimmed = personName.trim();
    const validationError = validateParticipantName(trimmed);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPeople((current) => [...current, { id: createId(), name: trimmed }]);
    setPersonName("");
    clearResults();
  };

  const startEditingPerson = (person: Person) => {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemPrice("");
    setEditingPersonId(person.id);
    setEditingPersonName(person.name);
    clearResults();
  };

  const savePersonEdit = () => {
    if (!editingPersonId) {
      return;
    }

    const trimmed = editingPersonName.trim();
    const validationError = validateParticipantName(trimmed);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPeople((current) =>
      current.map((person) =>
        person.id === editingPersonId ? { ...person, name: trimmed } : person,
      ),
    );
    cancelEditing();
    clearResults();
  };

  const removePerson = (personId: string) => {
    if (editingPersonId === personId) {
      cancelEditing();
    }

    setPeople((current) => current.filter((person) => person.id !== personId));
    setItems((current) =>
      current.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((id) => id !== personId),
      })),
    );
    clearResults();
  };

  const addItem = () => {
    const trimmedName = itemName.trim();
    const price = parseAmount(itemPrice);
    const validationError = validateItemFields(trimmedName, price);

    if (validationError) {
      setError(validationError);
      return;
    }

    setItems((current) => [
      ...current,
      { id: createId(), name: trimmedName, price, assignedTo: [] },
    ]);
    setItemName("");
    setItemPrice("");
    clearResults();
  };

  const startEditingItem = (item: ReceiptItem) => {
    setEditingPersonId(null);
    setEditingPersonName("");
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemPrice(item.price.toFixed(2));
    clearResults();
  };

  const saveItemEdit = () => {
    if (!editingItemId) {
      return;
    }

    const trimmedName = editingItemName.trim();
    const price = parseAmount(editingItemPrice);
    const validationError = validateItemFields(trimmedName, price);

    if (validationError) {
      setError(validationError);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === editingItemId
          ? { ...item, name: trimmedName, price }
          : item,
      ),
    );
    cancelEditing();
    clearResults();
  };

  const removeItem = (itemId: string) => {
    if (editingItemId === itemId) {
      cancelEditing();
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
    clearResults();
  };

  const assignItemToPerson = (itemId: string, personId: string) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (mode === "itemized") {
          return { ...item, assignedTo: [personId] };
        }

        const isAssigned = item.assignedTo.includes(personId);
        const assignedTo = isAssigned
          ? item.assignedTo.filter((id) => id !== personId)
          : [...item.assignedTo, personId];

        return { ...item, assignedTo };
      }),
    );
    clearResults();
  };

  const calculate = () => {
    const parsedBillTotal = parseAmount(billTotal);
    const parsedTax = parseAmount(tax);
    const parsedTip = resolveTipAmount(
      calculateItemsSubtotal(items),
      tipMode,
      tipPercent,
      parseAmount(customTip),
    );

    const validationError = validateSplitInput(
      mode,
      people,
      items,
      parsedBillTotal,
      parsedTax,
      parsedTip,
      tipMode,
      customTip,
    );

    if (validationError) {
      setError(validationError);
      setSession(null);
      return;
    }

    let result: Pick<SplitSession, "personTotals" | "summary">;

    if (mode === "even") {
      result = calculateEvenSplit(parsedBillTotal, people);
    } else if (mode === "itemized") {
      result = calculateItemizedSplit(items, people, parsedTax, parsedTip);
    } else {
      result = calculateHybridSplit(items, people, parsedTax, parsedTip);
    }

    setSession({
      mode,
      people,
      items,
      billTotal: parsedBillTotal,
      tax: parsedTax,
      tip: parsedTip,
      personTotals: result.personTotals,
      summary: result.summary,
    });
    setError(null);
  };

  const shareResults = async () => {
    if (!session) {
      return;
    }

    try {
      await Share.share({
        message: formatSessionShareText(session),
        title: "SplitSnap Results",
      });
    } catch {
      Alert.alert("Unable to share", "Something went wrong while sharing results.");
    }
  };

  const showItemizedFields = mode === "itemized" || mode === "hybrid";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.logo}>SplitSnap</Text>
              <Text style={styles.subtitle}>
                Choose a split mode, add participants, then calculate what
                everyone owes.
              </Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={resetSplit}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt Photo</Text>
            <Text style={styles.sectionHint}>
              Optional — attach a receipt image for your records.
            </Text>

            {receiptImageUri ? (
              <>
                <Image
                  source={{ uri: receiptImageUri }}
                  style={styles.receiptPreview}
                  resizeMode="cover"
                  accessibilityLabel="Receipt preview"
                />
                <View style={styles.receiptActions}>
                  <TouchableOpacity
                    style={styles.receiptSecondaryButton}
                    onPress={pickReceiptFromLibrary}
                  >
                    <Text style={styles.receiptSecondaryButtonText}>
                      Change
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.receiptDangerButton}
                    onPress={removeReceiptImage}
                  >
                    <Text style={styles.receiptDangerButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.receiptActions}>
                  <TouchableOpacity
                    style={styles.receiptOutlineButton}
                    onPress={takeReceiptPhoto}
                  >
                    <Text style={styles.receiptOutlineButtonText}>
                      Retake Photo
                    </Text>
                  </TouchableOpacity>
                </View>

                {isExtracting ? (
                  <View style={styles.extractingState}>
                    <ActivityIndicator color="#93c5fd" size="small" />
                    <Text style={styles.extractingText}>
                      Extracting receipt...
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.receiptPrimaryButton, styles.extractButton]}
                    onPress={handleExtractReceipt}
                  >
                    <Text style={styles.receiptPrimaryButtonText}>
                      Extract Receipt
                    </Text>
                  </TouchableOpacity>
                )}

                {extractedReceipt && !isExtracting && (
                  <View style={styles.extractedCard}>
                    <Text style={styles.extractedTitle}>Extracted Receipt</Text>
                    <Text style={styles.extractedRestaurant}>
                      {extractedReceipt.restaurantName}
                    </Text>

                    <Text style={styles.extractedItemsTitle}>Items</Text>
                    {extractedReceipt.items.map((item, index) => (
                      <View
                        key={`${item.name}-${item.price}-${index}`}
                        style={styles.extractedItemRow}
                      >
                        <Text style={styles.extractedItemName}>{item.name}</Text>
                        <Text style={styles.extractedItemPrice}>
                          {formatCurrency(item.price)}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.extractedSummary}>
                      <SummaryRow
                        label="Subtotal"
                        value={formatCurrency(extractedReceipt.subtotal)}
                      />
                      <SummaryRow
                        label="Tax"
                        value={formatCurrency(extractedReceipt.tax)}
                      />
                      <SummaryRow
                        label={`Tip (${formatTipSelectionLabel(tipMode, tipPercent)})`}
                        value={formatCurrency(extractedTipAmount)}
                        bold
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.useExtractedButton}
                      onPress={useExtractedReceipt}
                    >
                      <Text style={styles.useExtractedButtonText}>
                        Use Extracted Receipt
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.receiptPickerRow}>
                <TouchableOpacity
                  style={styles.receiptPrimaryButton}
                  onPress={takeReceiptPhoto}
                >
                  <Text style={styles.receiptPrimaryButtonText}>
                    Take Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.receiptOutlineButton}
                  onPress={pickReceiptFromLibrary}
                >
                  <Text style={styles.receiptOutlineButtonText}>
                    Choose from Library
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Mode</Text>
            {MODE_OPTIONS.map((option) => {
              const selected = mode === option.mode;
              return (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.modeOption,
                    selected && styles.modeOptionSelected,
                  ]}
                  onPress={() => changeMode(option.mode)}
                >
                  <Text
                    style={[
                      styles.modeLabel,
                      selected && styles.modeLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.modeDescription}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === "even" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Final Bill Total</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 86.40"
                placeholderTextColor="#64748b"
                value={billTotal}
                onChangeText={(value) => {
                  setBillTotal(value);
                  clearResults();
                }}
                keyboardType="decimal-pad"
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="Person name"
                placeholderTextColor="#64748b"
                value={personName}
                onChangeText={setPersonName}
                onSubmitEditing={addPerson}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addButton} onPress={addPerson}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {people.length === 0 ? (
              <Text style={styles.emptyText}>No participants yet.</Text>
            ) : (
              people.map((person) => {
                const isEditing = editingPersonId === person.id;

                if (isEditing) {
                  return (
                    <View key={person.id} style={styles.editCard}>
                      <TextInput
                        style={styles.input}
                        value={editingPersonName}
                        onChangeText={setEditingPersonName}
                        placeholder="Participant name"
                        placeholderTextColor="#64748b"
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={savePersonEdit}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={cancelEditing}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={person.id} style={styles.listItem}>
                    <Text style={styles.listItemText}>{person.name}</Text>
                    <View style={styles.listActions}>
                      <TouchableOpacity
                        onPress={() => startEditingPerson(person)}
                      >
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removePerson(person.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {showItemizedFields && (
            <>
              <View
                style={styles.section}
                onLayout={(event) => {
                  const sectionY = event.nativeEvent.layout.y;
                  receiptItemsSectionY.current = sectionY;

                  if (importMessage) {
                    scrollViewRef.current?.scrollTo({
                      y: sectionY,
                      animated: true,
                    });
                  }
                }}
              >
                <Text style={styles.sectionTitle}>Receipt Items</Text>
                {importMessage && (
                  <View style={styles.importMessageBox}>
                    <Text style={styles.importMessageText}>{importMessage}</Text>
                  </View>
                )}
                <TextInput
                  style={styles.input}
                  placeholder="Item name"
                  placeholderTextColor="#64748b"
                  value={itemName}
                  onChangeText={setItemName}
                />
                <TextInput
                  style={[styles.input, styles.inputSpacing]}
                  placeholder="Item price"
                  placeholderTextColor="#64748b"
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.fullButton} onPress={addItem}>
                  <Text style={styles.addButtonText}>Add Item</Text>
                </TouchableOpacity>

                {items.length === 0 ? (
                  <Text style={styles.emptyText}>No items added yet.</Text>
                ) : (
                  items.map((item) => {
                    const isEditing = editingItemId === item.id;

                    if (isEditing) {
                      return (
                        <View key={item.id} style={styles.editCard}>
                          <TextInput
                            style={styles.input}
                            value={editingItemName}
                            onChangeText={setEditingItemName}
                            placeholder="Item name"
                            placeholderTextColor="#64748b"
                            autoFocus
                          />
                          <TextInput
                            style={[styles.input, styles.inputSpacing]}
                            value={editingItemPrice}
                            onChangeText={setEditingItemPrice}
                            placeholder="Item price"
                            placeholderTextColor="#64748b"
                            keyboardType="decimal-pad"
                          />
                          <View style={styles.editActions}>
                            <TouchableOpacity
                              style={styles.saveButton}
                              onPress={saveItemEdit}
                            >
                              <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={cancelEditing}
                            >
                              <Text style={styles.cancelButtonText}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={item.id} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemTitle}>
                            {item.name} — {formatCurrency(item.price)}
                          </Text>
                          <View style={styles.listActions}>
                            <TouchableOpacity
                              onPress={() => startEditingItem(item)}
                            >
                              <Text style={styles.editText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeItem(item.id)}
                            >
                              <Text style={styles.removeText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={styles.assignmentLabel}>
                          {mode === "itemized"
                            ? "Assigned to:"
                            : "Shared with:"}
                        </Text>
                        <View style={styles.chipRow}>
                          {people.map((person) => {
                            const selected = item.assignedTo.includes(
                              person.id,
                            );
                            return (
                              <TouchableOpacity
                                key={person.id}
                                style={[
                                  styles.chip,
                                  selected && styles.chipSelected,
                                ]}
                                onPress={() =>
                                  assignItemToPerson(item.id, person.id)
                                }
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    selected && styles.chipTextSelected,
                                  ]}
                                >
                                  {person.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tax & Tip</Text>
                <Text style={styles.label}>Tax ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 7.12"
                  placeholderTextColor="#64748b"
                  value={tax}
                  onChangeText={(value) => {
                    setTax(value);
                    clearResults();
                  }}
                  keyboardType="decimal-pad"
                />

                <Text style={[styles.label, styles.inputSpacing]}>Tip</Text>
                <View style={styles.chipRow}>
                  {TIP_PERCENT_PRESETS.map((percent) => {
                    const selected =
                      tipMode === "percentage" && tipPercent === percent;
                    return (
                      <TouchableOpacity
                        key={percent}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => selectTipPreset(percent)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {percent}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      tipMode === "fixed" && styles.chipSelected,
                    ]}
                    onPress={selectCustomTipMode}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        tipMode === "fixed" && styles.chipTextSelected,
                      ]}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {tipMode === "percentage" ? (
                  <Text style={styles.calculatedTipText}>
                    Calculated tip: {formatCurrency(currentTipAmount)}
                    {itemsSubtotal > 0
                      ? ` (${tipPercent}% of ${formatCurrency(itemsSubtotal)})`
                      : " — add items to calculate"}
                  </Text>
                ) : (
                  <>
                    <TextInput
                      style={[styles.input, styles.inputSpacing]}
                      placeholder="Custom tip amount"
                      placeholderTextColor="#64748b"
                      value={customTip}
                      onChangeText={(value) => {
                        setCustomTip(value);
                        clearResults();
                      }}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.calculatedTipText}>
                      Tip amount: {formatCurrency(parseAmount(customTip))}
                    </Text>
                  </>
                )}
              </View>
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.calculateButton} onPress={calculate}>
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>

          {session && (
            <>
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>Receipt Summary</Text>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={shareResults}
                  >
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
                <SummaryRow
                  label="Subtotal"
                  value={formatCurrency(session.summary.subtotal)}
                />
                <SummaryRow
                  label="Tax"
                  value={formatCurrency(session.summary.tax)}
                />
                <SummaryRow
                  label="Tip"
                  value={formatCurrency(session.summary.tip)}
                />
                <SummaryRow
                  label="Final total"
                  value={formatCurrency(session.summary.finalTotal)}
                  bold
                />
                <SummaryRow
                  label="Sum of people totals"
                  value={formatCurrency(session.summary.sumOfPeopleTotals)}
                />
                <SummaryRow
                  label="Difference"
                  value={formatCurrency(session.summary.difference)}
                  bold
                  highlight={session.summary.difference === 0}
                />
              </View>

              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>What Each Person Owes</Text>
                {session.personTotals.map((person) => (
                  <View key={person.personId} style={styles.personResult}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <SummaryRow
                      label="Food subtotal"
                      value={formatCurrency(person.foodSubtotal)}
                    />
                    <SummaryRow
                      label="Tax share"
                      value={formatCurrency(person.taxShare)}
                    />
                    <SummaryRow
                      label="Tip share"
                      value={formatCurrency(person.tipShare)}
                    />
                    <SummaryRow
                      label="Final amount owed"
                      value={formatCurrency(person.finalAmount)}
                      bold
                      highlight
                    />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
};

function SummaryRow({ label, value, bold, highlight }: SummaryRowProps) {
  return (
    <View style={styles.resultRow}>
      <Text style={bold ? styles.resultLabelBold : styles.resultLabel}>
        {label}
      </Text>
      <Text
        style={[
          bold ? styles.resultValueBold : styles.resultValue,
          highlight && styles.resultValueHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  logo: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1e293b",
  },
  resetButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionHint: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  importMessageBox: {
    backgroundColor: "#14532d",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  importMessageText: {
    color: "#dcfce7",
    fontSize: 13,
    lineHeight: 18,
  },
  receiptPickerRow: {
    gap: 10,
  },
  receiptPrimaryButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  receiptPrimaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  extractButton: {
    marginTop: 10,
  },
  receiptOutlineButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  receiptOutlineButtonText: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: "600",
  },
  receiptPreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    marginBottom: 12,
  },
  receiptActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  receiptSecondaryButton: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  receiptSecondaryButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
  receiptDangerButton: {
    flex: 1,
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: "#991b1b",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  receiptDangerButtonText: {
    color: "#fecaca",
    fontSize: 14,
    fontWeight: "600",
  },
  extractingState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  extractingText: {
    color: "#93c5fd",
    fontSize: 15,
    fontWeight: "600",
  },
  extractedCard: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  extractedTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  extractedRestaurant: {
    color: "#93c5fd",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  extractedItemsTitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 6,
  },
  extractedSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  calculatedTipText: {
    color: "#93c5fd",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  extractedItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  extractedItemName: {
    color: "#e2e8f0",
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  extractedItemPrice: {
    color: "#e2e8f0",
    fontSize: 14,
  },
  useExtractedButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  useExtractedButtonText: {
    color: "#052e16",
    fontSize: 15,
    fontWeight: "700",
  },
  modeOption: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#0f172a",
  },
  modeOptionSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#172554",
  },
  modeLabel: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  modeLabelSelected: {
    color: "#ffffff",
  },
  modeDescription: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputSpacing: {
    marginTop: 10,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fullButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "#052e16",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 12,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  listItemText: {
    color: "#e2e8f0",
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  listActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#052e16",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  assignmentLabel: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1e293b",
  },
  chipSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#14532d",
  },
  chipText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#dcfce7",
  },
  editText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "600",
  },
  removeText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#450a0a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#991b1b",
  },
  errorText: {
    color: "#fecaca",
    fontSize: 14,
    lineHeight: 20,
  },
  calculateButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  calculateButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  resultCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  shareButton: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareButtonText: {
    color: "#93c5fd",
    fontSize: 14,
    fontWeight: "600",
  },
  personResult: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
    marginTop: 12,
  },
  personName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  resultLabel: {
    color: "#94a3b8",
    fontSize: 14,
  },
  resultValue: {
    color: "#e2e8f0",
    fontSize: 14,
  },
  resultLabelBold: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  resultValueBold: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  resultValueHighlight: {
    color: "#22c55e",
  },
});
